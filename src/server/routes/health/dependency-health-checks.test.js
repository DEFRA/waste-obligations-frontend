import { describe, expect, test, vi } from 'vitest'

import { runDependencyHealthChecks } from './dependency-health-checks.js'

function createOptions(overrides = {}) {
  const backendAccountApi = {
    getHeaders: vi.fn().mockResolvedValue({ Authorization: 'Bearer token' })
  }
  const wasteOrganisationsApi = {
    getHeaders: vi
      .fn()
      .mockResolvedValue({ Authorization: 'Basic organisations' })
  }
  const wasteObligationsApi = {
    getHeaders: vi
      .fn()
      .mockResolvedValue({ Authorization: 'Basic obligations' })
  }

  return {
    redisClient: { ping: vi.fn().mockResolvedValue('PONG') },
    backendAccountApi,
    wasteOrganisationsApi,
    wasteObligationsApi,
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
    fetchImpl: vi.fn().mockResolvedValue({ ok: true, status: 200 }),
    ...overrides
  }
}

describe('runDependencyHealthChecks', () => {
  test('reports every dependency as healthy', async () => {
    const options = createOptions()

    const report = await runDependencyHealthChecks(options)

    expect(report.status).toBe('Healthy')
    expect(report.results).toMatchObject({
      redis: { status: 'Healthy', data: { response: 'PONG' } },
      backendAccountToken: {
        status: 'Healthy',
        data: { requestedScope: expect.any(String) }
      },
      backendAccountApi: { status: 'Healthy', data: { statusCode: 200 } },
      wasteOrganisationsApi: {
        status: 'Healthy',
        data: { statusCode: 200 }
      },
      wasteObligationsApi: {
        status: 'Healthy',
        data: { statusCode: 200 }
      },
      azureAdB2c: { status: 'Healthy', data: { statusCode: 200 } }
    })
    expect(options.fetchImpl).toHaveBeenCalledWith(
      'https://backend-account.example/admin/health',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
        signal: expect.any(AbortSignal)
      })
    )
    expect(options.fetchImpl).toHaveBeenCalledWith(
      'https://waste-organisations.example/health/authorized',
      expect.objectContaining({
        headers: { Authorization: 'Basic organisations' }
      })
    )
    expect(options.fetchImpl).toHaveBeenCalledWith(
      'https://waste-obligations.example/health/authorized',
      expect.objectContaining({
        headers: { Authorization: 'Basic obligations' }
      })
    )
  })

  test('reports token acquisition separately and skips the API check when it fails', async () => {
    const backendAccountApi = {
      getHeaders: vi
        .fn()
        .mockRejectedValue(new Error('token endpoint unavailable'))
    }
    const options = createOptions({ backendAccountApi })

    const report = await runDependencyHealthChecks(options)

    expect(report.status).toBe('Unhealthy')
    expect(report.results.backendAccountToken).toMatchObject({
      status: 'Unhealthy',
      data: { failure: 'unavailable' }
    })
    expect(report.results.backendAccountApi).toEqual({
      status: 'Unhealthy',
      description: 'Backend Account API check was not attempted',
      data: { failure: 'token_unavailable' }
    })
    expect(options.fetchImpl).not.toHaveBeenCalledWith(
      'https://backend-account.example/admin/health',
      expect.anything()
    )
  })

  test('reports downstream HTTP failures without exposing an endpoint or error', async () => {
    const options = createOptions({
      fetchImpl: vi.fn(async (url) => ({
        ok: url !== 'https://waste-organisations.example/health/authorized',
        status:
          url === 'https://waste-organisations.example/health/authorized'
            ? 503
            : 200
      }))
    })

    const report = await runDependencyHealthChecks(options)

    expect(report.status).toBe('Unhealthy')
    expect(report.results.wasteOrganisationsApi).toMatchObject({
      status: 'Unhealthy',
      data: { failure: 'http_503' }
    })
    expect(JSON.stringify(report.results.wasteOrganisationsApi)).not.toContain(
      'waste-organisations.example'
    )
  })

  test('reports an incomplete Azure AD B2C configuration without making a discovery call', async () => {
    const options = createOptions({
      b2cConfig: {
        clientId: '',
        clientSecret: '',
        instance: '',
        domain: '',
        userFlow: ''
      }
    })

    const report = await runDependencyHealthChecks(options)

    expect(report.status).toBe('Unhealthy')
    expect(report.results.azureAdB2c).toMatchObject({
      status: 'Unhealthy',
      data: { failure: 'configuration' }
    })
    expect(options.fetchImpl).not.toHaveBeenCalledWith(
      expect.stringContaining('.b2clogin.com'),
      expect.anything()
    )
  })

  test('times out an unresponsive Redis dependency', async () => {
    const options = createOptions({
      redisClient: { ping: vi.fn(() => new Promise(() => {})) },
      timeoutMs: 1
    })

    const report = await runDependencyHealthChecks(options)

    expect(report.status).toBe('Unhealthy')
    expect(report.results.redis).toMatchObject({
      status: 'Unhealthy',
      data: { failure: 'timeout' }
    })
  })
})
