import { config } from '#/config/config.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { buildTracingHeader } from '#/server/services/base/tracing-headers.js'

const TOKEN_BUFFER_SECONDS = 60

let cachedToken = null
let expiresAtEpochSeconds = 0
let refreshPromise = null

export async function getServiceOAuthAccessToken(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch
  const oauth = options.oauth ?? config.get('oauth')
  const logger = options.logger ?? createLogger()
  const traceId = options.traceId ?? null
  const tracingHeader = options.tracingHeader ?? null

  if (!oauth?.clientId || !oauth?.clientSecret || !oauth?.tokenEndpoint) {
    throw new Error(
      'OAuth client credentials are not configured (OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_TOKEN_ENDPOINT)'
    )
  }

  const now = Date.now() / 1000
  if (cachedToken && expiresAtEpochSeconds > now + TOKEN_BUFFER_SECONDS) {
    return cachedToken
  }

  if (!refreshPromise) {
    refreshPromise = requestToken({
      oauth,
      fetchImpl,
      logger,
      traceId,
      tracingHeader
    }).finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

async function requestToken({
  oauth,
  fetchImpl,
  logger,
  traceId,
  tracingHeader
}) {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret
  })

  if (oauth.scope) {
    body.set('scope', oauth.scope)
  }

  const response = await fetchImpl(oauth.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...buildTracingHeader(tracingHeader, traceId)
    },
    body
  })

  if (!response.ok) {
    logger.warn(
      {
        status: response.status,
        statusText: response.statusText
      },
      'OAuth client credentials token request failed'
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

  cachedToken = data.access_token
  expiresAtEpochSeconds = Date.now() / 1000 + Number(data.expires_in ?? 3600)

  return cachedToken
}

export function resetServiceOAuthTokenCacheForTests() {
  cachedToken = null
  expiresAtEpochSeconds = 0
  refreshPromise = null
}
