import Joi from 'joi'
import { withTraceId } from '@defra/hapi-tracing'

const TOKEN_BUFFER_SECONDS = 60
const DEFAULT_TOKEN_EXPIRES_IN_SECONDS = 3600
const MIN_CACHE_TTL_MS = 1000

const oauthOptionsSchema = Joi.object({
  clientId: Joi.string().trim().required(),
  clientSecret: Joi.string().trim().required(),
  tokenEndpoint: Joi.string().trim().required(),
  scope: Joi.string().trim().required(),
  cacheClient: Joi.object().required(),
  cacheTtlMs: Joi.number().integer().min(MIN_CACHE_TTL_MS).required(),
  fetchImpl: Joi.function().required(),
  logger: Joi.object().required(),
  tracingHeader: Joi.string().required(),
  signal: Joi.object().optional()
})

const refreshPromises = new Map()

function validateOAuthOptions(options) {
  const { error, value } = oauthOptionsSchema.validate(options, {
    abortEarly: false
  })

  if (error) {
    throw new Error(
      `OAuth options are not valid (${error.details.map((detail) => detail.message).join('; ')})`
    )
  }

  return value
}

function buildCacheKey(clientId, scope) {
  return ['oauth-token', clientId, scope].join(':')
}

async function getCachedToken(cacheKey, cacheClient, logger) {
  try {
    const value = await cacheClient.get(cacheKey)
    if (value) {
      return value
    }
  } catch (error) {
    logger.warn(
      { err: error },
      `Unable to read OAuth token from cache (${cacheKey})`
    )
  }

  return null
}

async function setCachedToken({
  cacheKey,
  token,
  expiresInSeconds,
  cacheClient,
  logger
}) {
  const ttlMs = Math.max(
    (expiresInSeconds - TOKEN_BUFFER_SECONDS) * 1000,
    MIN_CACHE_TTL_MS
  )

  try {
    await cacheClient.set(cacheKey, token, 'PX', ttlMs)
  } catch (error) {
    logger.warn(
      { err: error },
      `Unable to write OAuth token to cache: cacheKey=${cacheKey}`
    )
  }
}

function refreshAccessToken(cacheKey, requestOptions) {
  if (!refreshPromises.has(cacheKey)) {
    refreshPromises.set(
      cacheKey,
      requestToken({ ...requestOptions, cacheKey }).finally(() => {
        refreshPromises.delete(cacheKey)
      })
    )
  }

  return refreshPromises.get(cacheKey)
}

export async function getServiceOAuthAccessToken(options) {
  const {
    clientId,
    clientSecret,
    scope,
    tokenEndpoint,
    cacheClient,
    fetchImpl,
    logger,
    tracingHeader,
    signal
  } = validateOAuthOptions(options)

  const cacheKey = buildCacheKey(clientId, scope)
  const cached = await getCachedToken(cacheKey, cacheClient, logger)

  if (cached) {
    return cached
  }

  return refreshAccessToken(cacheKey, {
    clientId,
    clientSecret,
    scope,
    tokenEndpoint,
    cacheClient,
    fetchImpl,
    logger,
    tracingHeader,
    signal
  })
}

async function requestToken({
  cacheKey,
  clientId,
  clientSecret,
  scope,
  tokenEndpoint,
  cacheClient,
  fetchImpl,
  logger,
  tracingHeader,
  signal
}) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope
  })

  const request = {
    method: 'POST',
    headers: withTraceId(tracingHeader, {
      'Content-Type': 'application/x-www-form-urlencoded'
    }),
    body
  }

  if (signal) {
    request.signal = signal
  }

  const response = await fetchImpl(tokenEndpoint, request)

  if (!response.ok) {
    logger.warn(
      `OAuth client credentials token request failed: status=${response.status}, statusText=${response.statusText}`
    )
    throw new Error(
      `OAuth token request failed (${response.status} ${response.statusText})`
    )
  }

  const data = await response.json()
  if (!data?.access_token) {
    logger.warn('OAuth token response did not include access_token')
    throw new Error('OAuth token response did not include access_token')
  }

  const expiresInSeconds = Number(
    data.expires_in ?? DEFAULT_TOKEN_EXPIRES_IN_SECONDS
  )

  await setCachedToken({
    cacheKey,
    token: data.access_token,
    expiresInSeconds,
    cacheClient,
    logger
  })

  return data.access_token
}

export function resetServiceOAuthTokenCacheForTests() {
  refreshPromises.clear()
}
