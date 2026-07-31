import { createTestServer } from '#/test-helpers/create-test-server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#healthController', () => {
  let server

  beforeAll(async () => {
    server = await createTestServer()
    await server.initialize()
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

  test('provides a public aggregate downstream dependency report', async () => {
    server.app.healthCheckDependencies = {
      redisClient: { ping: vi.fn().mockResolvedValue('PONG') },
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
      url: '/health/all'
    })

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.result).toMatchObject({
      status: 'Healthy',
      results: {
        backendAccountToken: { status: 'Healthy' },
        backendAccountApi: { status: 'Healthy' }
      }
    })
  })
})
