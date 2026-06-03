import { config } from '#/config/config.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { buildTracingHeader } from '#/server/services/base/tracing-headers.js'

const TOKEN_BUFFER_SECONDS = 60
const DEFAULT_TOKEN_EXPIRES_IN_SECONDS = 3600

let cachedToken = null
let expiresAtEpochSeconds = 0
let refreshPromise = null

function assertOAuthConfigured(oauth) {
  if (!oauth?.clientId || !oauth?.clientSecret || !oauth?.tokenEndpoint) {
    throw new Error(
      'OAuth client credentials are not configured (OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_TOKEN_ENDPOINT)'
    )
  }
}

function getCachedTokenIfValid() {
  const now = Date.now() / 1000
  if (cachedToken && expiresAtEpochSeconds > now + TOKEN_BUFFER_SECONDS) {
    return cachedToken
  }
  return null
}

function refreshAccessToken(requestOptions) {
  if (!refreshPromise) {
    refreshPromise = requestToken(requestOptions).finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export async function getServiceOAuthAccessToken(options = {}) {
  const oauth = options.oauth ?? config.get('oauth')
  assertOAuthConfigured(oauth)

  const cached = getCachedTokenIfValid()
  if (cached) {
    return cached
  }

  return refreshAccessToken({
    oauth,
    fetchImpl: options.fetchImpl ?? fetch,
    logger: options.logger ?? createLogger(),
    traceId: options.traceId ?? null,
    tracingHeader: options.tracingHeader ?? null
  })
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
  expiresAtEpochSeconds =
    Date.now() / 1000 +
    Number(data.expires_in ?? DEFAULT_TOKEN_EXPIRES_IN_SECONDS)

  return cachedToken
}

export function resetServiceOAuthTokenCacheForTests() {
  cachedToken = null
  expiresAtEpochSeconds = 0
  refreshPromise = null
}
