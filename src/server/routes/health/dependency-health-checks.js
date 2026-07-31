import { config } from '#/config/config.js'
import { getB2cAuthorityPrefix } from '#/server/auth/azure-ad-b2c.js'

const HEALTHY = 'Healthy'
const UNHEALTHY = 'Unhealthy'

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

async function runCheck(description, check) {
  const startedAt = performance.now()

  try {
    const data = await check()
    return healthy(description, { ...data, durationMs: durationMs(startedAt) })
  } catch (error) {
    return unhealthy(description, {
      failure: failureReason(error),
      durationMs: durationMs(startedAt)
    })
  }
}

function healthUrl(baseUrl, path) {
  return new URL(path, baseUrl).toString()
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

async function getApiHealth({
  apiService,
  baseUrl,
  healthPath,
  fetchImpl,
  timeoutMs
}) {
  const signal = AbortSignal.timeout(timeoutMs)
  const headers = await apiService.getHeaders({ signal })

  return getHealthResponse({
    fetchImpl,
    url: healthUrl(baseUrl, healthPath),
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

function skippedBecauseTokenFailed() {
  return unhealthy('Backend Account API check was not attempted', {
    failure: 'token_unavailable'
  })
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

  return {
    redisClient: server.app.redisClient,
    backendAccountApi: server.app.backendAccountApi,
    wasteOrganisationsApi: server.app.wasteOrganisationsApi,
    wasteObligationsApi: server.app.wasteObligationsApi,
    backendAccountBaseUrl: config.get('backendAccountApi.baseUrl'),
    wasteOrganisationsBaseUrl: config.get('wasteOrganisationsApi.baseUrl'),
    wasteObligationsBaseUrl: config.get('wasteObligationsApi.baseUrl'),
    b2cConfig: config.get('auth.azureAdB2c'),
    timeoutMs: config.get('health.downstreamTimeoutMs')
  }
}

/**
 * Runs all required downstream checks and returns a Waste Obligations-style
 * aggregate health report. The report intentionally excludes dependency URLs,
 * token values and exception messages because this route is public.
 */
export async function runDependencyHealthChecks({
  redisClient,
  backendAccountApi,
  wasteOrganisationsApi,
  wasteObligationsApi,
  backendAccountBaseUrl,
  wasteOrganisationsBaseUrl,
  wasteObligationsBaseUrl,
  b2cConfig,
  timeoutMs = 5000,
  fetchImpl = fetch
}) {
  const redisCheck = runCheck('Connected to Redis', async () => {
    const response = await withTimeout(redisClient.ping(), timeoutMs)

    if (response !== 'PONG') {
      throw new Error('Redis did not respond to PING')
    }

    return { response }
  })
  const wasteOrganisationsCheck = runCheck(
    'Connected to Waste Organisations API',
    () =>
      getApiHealth({
        apiService: wasteOrganisationsApi,
        baseUrl: wasteOrganisationsBaseUrl,
        healthPath: '/health/authorized',
        fetchImpl,
        timeoutMs
      })
  )
  const wasteObligationsCheck = runCheck(
    'Connected to Waste Obligations API',
    () =>
      getApiHealth({
        apiService: wasteObligationsApi,
        baseUrl: wasteObligationsBaseUrl,
        healthPath: '/health/authorized',
        fetchImpl,
        timeoutMs
      })
  )
  const azureAdB2cCheck = runCheck('Connected to Azure AD B2C', () =>
    getHealthResponse({
      fetchImpl,
      url: getB2cDiscoveryUrl(b2cConfig),
      timeoutMs
    })
  )

  let backendAccountHeaders
  const backendAccountToken = await runCheck(
    'Retrieved an access token for Backend Account API',
    async () => {
      const signal = AbortSignal.timeout(timeoutMs)
      backendAccountHeaders = await backendAccountApi.getHeaders({ signal })

      if (!backendAccountHeaders.Authorization) {
        throw new Error('Backend Account API access token is missing')
      }

      return { requestedScope: config.get('backendAccountApi.scope') }
    }
  )
  const backendAccountApiCheck =
    backendAccountToken.status === HEALTHY
      ? await runCheck('Connected to Backend Account API', () =>
          getHealthResponse({
            fetchImpl,
            url: healthUrl(backendAccountBaseUrl, '/admin/health'),
            headers: backendAccountHeaders,
            timeoutMs
          })
        )
      : skippedBecauseTokenFailed()

  const [redis, wasteOrganisations, wasteObligations, azureAdB2c] =
    await Promise.all([
      redisCheck,
      wasteOrganisationsCheck,
      wasteObligationsCheck,
      azureAdB2cCheck
    ])

  const results = {
    redis,
    backendAccountToken,
    backendAccountApi: backendAccountApiCheck,
    wasteOrganisationsApi: wasteOrganisations,
    wasteObligationsApi: wasteObligations,
    azureAdB2c
  }
  const isHealthy = Object.values(results).every(
    (result) => result.status === HEALTHY
  )

  return {
    status: isHealthy ? HEALTHY : UNHEALTHY,
    results
  }
}
