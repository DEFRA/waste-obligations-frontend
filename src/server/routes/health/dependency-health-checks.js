import { config } from '#/config/config.js'
import { getB2cAuthorityPrefix } from '#/server/auth/azure-ad-b2c.js'

const HEALTHY = 'Healthy'
const UNHEALTHY = 'Unhealthy'
const JWT_SECTION_COUNT = 3
const JWT_PAYLOAD_SECTION_INDEX = 1
const AUTHORIZED_HEALTH_PATH = '/health/authorized'
const BACKEND_ACCOUNT_HEALTH_PATH = '/admin/health'

class HealthHttpError extends Error {
  constructor(statusCode) {
    super(`Downstream health check failed with status ${statusCode}`)
    this.statusCode = statusCode
  }
}

class HealthConfigurationError extends Error {}

function durationMs(startedAt) {
  return Math.round(performance.now() - startedAt)
}

function failureReason(error) {
  if (error instanceof HealthConfigurationError) {
    return 'configuration'
  }

  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return 'timeout'
  }

  if (Number.isInteger(error?.statusCode)) {
    return `http_${error.statusCode}`
  }

  return 'unavailable'
}

function statusCodeFrom(error) {
  return Number.isInteger(error?.statusCode) ? error.statusCode : undefined
}

function healthy(description, data = {}) {
  return {
    status: HEALTHY,
    description,
    data
  }
}

function unhealthy(description, data = {}) {
  return {
    status: UNHEALTHY,
    description,
    data
  }
}

function healthUrl(baseUrl, path) {
  return new URL(path, baseUrl).toString()
}

function buildRedisEndpoint(redisConfig) {
  const scheme = redisConfig.useTLS ? 'rediss' : 'redis'
  return `${scheme}://${redisConfig.host}:6379`
}

function withTimeout(promise, timeoutMs) {
  const signal = AbortSignal.timeout(timeoutMs)
  const timeout = new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), {
      once: true
    })
  })

  return Promise.race([promise, timeout])
}

async function getHealthResponse({
  fetchImpl,
  url,
  headers,
  timeoutMs,
  signal = AbortSignal.timeout(timeoutMs)
}) {
  const response = await fetchImpl(url, {
    headers,
    signal
  })

  if (!response.ok) {
    throw new HealthHttpError(response.status)
  }

  return { statusCode: response.status }
}

async function getApiHealth({ apiService, baseUrl, fetchImpl, timeoutMs }) {
  const signal = AbortSignal.timeout(timeoutMs)
  const headers = await apiService.getHeaders({ signal })

  return getHealthResponse({
    fetchImpl,
    url: healthUrl(baseUrl, AUTHORIZED_HEALTH_PATH),
    headers,
    timeoutMs,
    signal
  })
}

function getB2cDiscoveryUrl(b2cConfig) {
  const authorityPrefix = getB2cAuthorityPrefix(b2cConfig)

  if (!authorityPrefix || !b2cConfig.clientId || !b2cConfig.clientSecret) {
    throw new HealthConfigurationError('Azure AD B2C is not fully configured')
  }

  return new URL(
    'v2.0/.well-known/openid-configuration',
    `${authorityPrefix}/`
  ).toString()
}

function downstreamSucceeded(endpoint, response, startedAt) {
  return {
    status: 'Succeeded',
    endpoint,
    ...response,
    durationMs: durationMs(startedAt)
  }
}

function downstreamFailed(endpoint, error, startedAt) {
  const statusCode = statusCodeFrom(error)

  return {
    status: 'Failed',
    endpoint,
    ...(statusCode === undefined ? {} : { statusCode }),
    failure: failureReason(error),
    durationMs: durationMs(startedAt)
  }
}

async function runDownstreamCheck(endpoint, check) {
  const startedAt = performance.now()

  try {
    const response = await check()
    return healthy(`Connected to ${endpoint}`, {
      downstream: downstreamSucceeded(endpoint, response, startedAt)
    })
  } catch (error) {
    return unhealthy(`Failed to connect to ${endpoint}`, {
      downstream: downstreamFailed(endpoint, error, startedAt)
    })
  }
}

function scopeToAudience(scope) {
  const withoutDefaultScope = scope.replace(/\/\.default$/, '')
  const schemeSeparatorIndex = withoutDefaultScope.indexOf('://')
  const separatorIndex = withoutDefaultScope.lastIndexOf('/')

  return separatorIndex === -1 || separatorIndex <= schemeSeparatorIndex + 2
    ? withoutDefaultScope
    : withoutDefaultScope.slice(0, separatorIndex)
}

function tryReadAudiences(accessToken) {
  const sections = accessToken.split('.')

  if (sections.length !== JWT_SECTION_COUNT) {
    return { claimsAvailable: false, audiences: [] }
  }

  try {
    const payload = JSON.parse(
      Buffer.from(sections[JWT_PAYLOAD_SECTION_INDEX], 'base64url').toString(
        'utf8'
      )
    )
    const audiences = audiencesFrom(payload.aud)

    return { claimsAvailable: true, audiences }
  } catch {
    return { claimsAvailable: false, audiences: [] }
  }
}

function audiencesFrom(audienceClaim) {
  if (Array.isArray(audienceClaim)) {
    return audienceClaim.filter((audience) => typeof audience === 'string')
  }

  return typeof audienceClaim === 'string' ? [audienceClaim] : []
}

function accessTokenData(authorization, scope, startedAt) {
  const accessToken = authorization.replace(/^Bearer\s+/i, '')
  const { claimsAvailable, audiences } = tryReadAudiences(accessToken)
  const requestedScope = scope ?? ''
  const requestedAudiences = requestedScope
    .split(/\s+/)
    .map(scopeToAudience)
    .filter(Boolean)

  return {
    status: 'Retrieved',
    requestedScope,
    claimsAvailable,
    audiences,
    audienceMatchesRequestedScope:
      claimsAvailable && requestedAudiences.length
        ? audiences.some((audience) => requestedAudiences.includes(audience))
        : null,
    durationMs: durationMs(startedAt)
  }
}

function failedAccessTokenData(error, startedAt) {
  return {
    status: 'Failed',
    failure: failureReason(error),
    durationMs: durationMs(startedAt)
  }
}

async function checkBackendAccount({
  backendAccountApi,
  backendAccountBaseUrl,
  fetchImpl,
  timeoutMs,
  scope
}) {
  const endpoint = healthUrl(backendAccountBaseUrl, BACKEND_ACCOUNT_HEALTH_PATH)
  const tokenStartedAt = performance.now()
  let headers
  let accessToken

  try {
    const signal = AbortSignal.timeout(timeoutMs)
    headers = await backendAccountApi.getHeaders({ signal })

    if (!headers.Authorization) {
      throw new Error('Backend Account API access token is missing')
    }

    accessToken = accessTokenData(headers.Authorization, scope, tokenStartedAt)
  } catch (error) {
    return unhealthy(
      'Failed to retrieve an access token for Backend Account API',
      {
        accessToken: failedAccessTokenData(error, tokenStartedAt),
        downstream: {
          status: 'Not attempted',
          endpoint,
          failure: 'token_unavailable'
        }
      }
    )
  }

  const downstreamStartedAt = performance.now()

  try {
    const response = await getHealthResponse({
      fetchImpl,
      url: endpoint,
      headers,
      timeoutMs
    })

    return healthy(`Connected to ${endpoint}`, {
      accessToken,
      downstream: downstreamSucceeded(endpoint, response, downstreamStartedAt)
    })
  } catch (error) {
    return unhealthy(
      `Failed to connect to ${endpoint} after retrieving an access token`,
      {
        accessToken,
        downstream: downstreamFailed(endpoint, error, downstreamStartedAt)
      }
    )
  }
}

function createRedisCheck({ redisClient, redisEndpoint, timeoutMs }) {
  return runDownstreamCheck(redisEndpoint, async () => {
    const response = await withTimeout(redisClient.ping(), timeoutMs)

    if (response !== 'PONG') {
      throw new Error('Redis did not respond to PING')
    }

    return { response }
  })
}

function createApiCheck({ apiService, baseUrl, fetchImpl, timeoutMs }) {
  const endpoint = healthUrl(baseUrl, AUTHORIZED_HEALTH_PATH)

  return runDownstreamCheck(endpoint, () =>
    getApiHealth({
      apiService,
      baseUrl,
      fetchImpl,
      timeoutMs
    })
  )
}

function createAzureAdB2cCheck({ b2cConfig, fetchImpl, timeoutMs }) {
  try {
    const endpoint = getB2cDiscoveryUrl(b2cConfig)

    return runDownstreamCheck(endpoint, () =>
      getHealthResponse({
        fetchImpl,
        url: endpoint,
        timeoutMs
      })
    )
  } catch (error) {
    return Promise.resolve(
      unhealthy('Azure AD B2C is not configured', {
        downstream: {
          status: 'Not attempted',
          endpoint: 'not configured',
          failure: failureReason(error)
        }
      })
    )
  }
}

function healthReport(results) {
  const isHealthy = Object.values(results).every(
    (result) => result.status === HEALTHY
  )

  return {
    status: isHealthy ? HEALTHY : UNHEALTHY,
    results
  }
}

/**
 * Creates the dependencies used by the aggregate health endpoint.
 * `server.app.healthCheckDependencies` is an intentional test seam.
 *
 * @param {import('@hapi/hapi').Server} server
 */
export function createDependencyHealthCheckOptions(server) {
  if (server.app.healthCheckDependencies) {
    return server.app.healthCheckDependencies
  }

  const redisConfig = config.get('redis')

  return {
    redisClient: server.app.redisClient,
    redisEndpoint: buildRedisEndpoint(redisConfig),
    backendAccountApi: server.app.backendAccountApi,
    wasteOrganisationsApi: server.app.wasteOrganisationsApi,
    wasteObligationsApi: server.app.wasteObligationsApi,
    backendAccountBaseUrl: config.get('backendAccountApi.baseUrl'),
    wasteOrganisationsBaseUrl: config.get('wasteOrganisationsApi.baseUrl'),
    wasteObligationsBaseUrl: config.get('wasteObligationsApi.baseUrl'),
    backendAccountScope: config.get('backendAccountApi.scope'),
    b2cConfig: config.get('auth.azureAdB2c'),
    timeoutMs: config.get('health.downstreamTimeoutMs')
  }
}

/**
 * Runs all required downstream checks and returns a Waste Obligations-style
 * aggregate health report. Each result groups all checks for one logical
 * dependency. It intentionally excludes token values and exception messages.
 */
export async function runDependencyHealthChecks({
  redisClient,
  redisEndpoint = 'redis://unknown:6379',
  backendAccountApi,
  wasteOrganisationsApi,
  wasteObligationsApi,
  backendAccountBaseUrl,
  wasteOrganisationsBaseUrl,
  wasteObligationsBaseUrl,
  backendAccountScope,
  b2cConfig,
  timeoutMs = 5000,
  fetchImpl = fetch
}) {
  const [
    Redis,
    WasteOrganisations,
    WasteObligations,
    AzureAdB2c,
    BackendAccount
  ] = await Promise.all([
    createRedisCheck({ redisClient, redisEndpoint, timeoutMs }),
    createApiCheck({
      apiService: wasteOrganisationsApi,
      baseUrl: wasteOrganisationsBaseUrl,
      fetchImpl,
      timeoutMs
    }),
    createApiCheck({
      apiService: wasteObligationsApi,
      baseUrl: wasteObligationsBaseUrl,
      fetchImpl,
      timeoutMs
    }),
    createAzureAdB2cCheck({ b2cConfig, fetchImpl, timeoutMs }),
    checkBackendAccount({
      backendAccountApi,
      backendAccountBaseUrl,
      fetchImpl,
      timeoutMs,
      scope: backendAccountScope
    })
  ])

  return healthReport({
    Redis,
    BackendAccount,
    WasteOrganisations,
    WasteObligations,
    AzureAdB2c
  })
}
