import { createTestServer } from '#/test-helpers/create-test-server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#healthController', () => {
  let server

  beforeAll(async () => {
    server = await createTestServer()
    await server.initialize()
    server.app.healthAllToken = 'health-test-token'
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(result).toEqual({ message: 'success' })
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('rejects aggregate health requests without the shared header token', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health/all'
    })

    expect(response.statusCode).toBe(statusCodes.unauthorized)
  })

  test('provides an aggregate downstream dependency report with the shared header token', async () => {
    server.app.healthCheckDependencies = {
      redisClient: { ping: vi.fn().mockResolvedValue('PONG') },
      redisEndpoint: 'redis://redis.example:6379',
      backendAccountApi: {
        getHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer token' })
      },
      wasteOrganisationsApi: {
        getHeaders: vi
          .fn()
          .mockResolvedValue({ Authorization: 'Basic organisations' })
      },
      wasteObligationsApi: {
        getHeaders: vi
          .fn()
          .mockResolvedValue({ Authorization: 'Basic obligations' })
      },
      backendAccountBaseUrl: 'https://backend-account.example/api/',
      backendAccountScope: 'api://backend-account/.default',
      wasteOrganisationsBaseUrl: 'https://waste-organisations.example',
      wasteObligationsBaseUrl: 'https://waste-obligations.example',
      b2cConfig: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        instance: 'https://tenant.b2clogin.com',
        domain: 'tenant.onmicrosoft.com',
        userFlow: 'B2C_1A_SIGN_IN'
      },
      timeoutMs: 1000,
      fetchImpl: vi.fn().mockResolvedValue({ ok: true, status: 200 })
    }

    const response = await server.inject({
      method: 'GET',
      url: '/health/all',
      headers: { 'x-health-check-token': 'health-test-token' }
    })

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.result).toMatchObject({
      status: 'Healthy',
      results: {
        BackendAccount: {
          status: 'Healthy',
          data: {
            accessToken: { status: 'Retrieved' },
            downstream: { status: 'Succeeded' }
          }
        }
      }
    })
  })

  test('returns service unavailable when a downstream dependency is unhealthy', async () => {
    server.app.healthCheckDependencies = {
      redisClient: { ping: vi.fn().mockResolvedValue('NOPE') },
      redisEndpoint: 'redis://redis.example:6379',
      backendAccountApi: {
        getHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer token' })
      },
      wasteOrganisationsApi: {
        getHeaders: vi
          .fn()
          .mockResolvedValue({ Authorization: 'Basic organisations' })
      },
      wasteObligationsApi: {
        getHeaders: vi
          .fn()
          .mockResolvedValue({ Authorization: 'Basic obligations' })
      },
      backendAccountBaseUrl: 'https://backend-account.example/api/',
      backendAccountScope: 'api://backend-account/.default',
      wasteOrganisationsBaseUrl: 'https://waste-organisations.example',
      wasteObligationsBaseUrl: 'https://waste-obligations.example',
      b2cConfig: {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        instance: 'https://tenant.b2clogin.com',
        domain: 'tenant.onmicrosoft.com',
        userFlow: 'B2C_1A_SIGN_IN'
      },
      timeoutMs: 1000,
      fetchImpl: vi.fn().mockResolvedValue({ ok: true, status: 200 })
    }

    const response = await server.inject({
      method: 'GET',
      url: '/health/all',
      headers: { 'x-health-check-token': 'health-test-token' }
    })

    expect(response.statusCode).toBe(statusCodes.serviceUnavailable)
    expect(response.result.status).toBe('Unhealthy')
    expect(response.result.results.Redis.status).toBe('Unhealthy')
  })
})
