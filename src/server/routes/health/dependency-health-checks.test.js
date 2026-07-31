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
    redisEndpoint: 'redis://redis.example:6379',
    backendAccountApi,
    wasteOrganisationsApi,
    wasteObligationsApi,
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
      Redis: {
        status: 'Healthy',
        data: {
          downstream: {
            status: 'Succeeded',
            endpoint: 'redis://redis.example:6379',
            response: 'PONG'
          }
        }
      },
      BackendAccount: {
        status: 'Healthy',
        data: {
          accessToken: {
            status: 'Retrieved',
            requestedScope: 'api://backend-account/.default'
          },
          downstream: {
            status: 'Succeeded',
            endpoint: 'https://backend-account.example/admin/health',
            statusCode: 200
          }
        }
      },
      WasteOrganisations: {
        status: 'Healthy',
        data: {
          downstream: {
            status: 'Succeeded',
            endpoint: 'https://waste-organisations.example/health/authorized',
            statusCode: 200
          }
        }
      },
      WasteObligations: {
        status: 'Healthy',
        data: {
          downstream: {
            status: 'Succeeded',
            endpoint: 'https://waste-obligations.example/health/authorized',
            statusCode: 200
          }
        }
      },
      AzureAdB2c: {
        status: 'Healthy',
        data: { downstream: { statusCode: 200 } }
      }
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
    expect(report.results.BackendAccount).toMatchObject({
      status: 'Unhealthy',
      data: {
        accessToken: { status: 'Failed', failure: 'unavailable' },
        downstream: {
          status: 'Not attempted',
          endpoint: 'https://backend-account.example/admin/health',
          failure: 'token_unavailable'
        }
      }
    })
    expect(options.fetchImpl).not.toHaveBeenCalledWith(
      'https://backend-account.example/admin/health',
      expect.anything()
    )
  })

  test('reports token audience information without returning the token', async () => {
    const jwt = [
      'header',
      Buffer.from(JSON.stringify({ aud: 'api://backend-account' })).toString(
        'base64url'
      ),
      'signature'
    ].join('.')
    const options = createOptions({
      backendAccountApi: {
        getHeaders: vi
          .fn()
          .mockResolvedValue({ Authorization: `Bearer ${jwt}` })
      }
    })

    const report = await runDependencyHealthChecks(options)

    expect(report.results.BackendAccount.data.accessToken).toMatchObject({
      status: 'Retrieved',
      requestedScope: 'api://backend-account/.default',
      claimsAvailable: true,
      audiences: ['api://backend-account'],
      audienceMatchesRequestedScope: true
    })
    expect(JSON.stringify(report)).not.toContain(jwt)
  })

  test('reports the attempted endpoint and HTTP failure', async () => {
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
    expect(report.results.WasteOrganisations).toMatchObject({
      status: 'Unhealthy',
      data: {
        downstream: {
          status: 'Failed',
          endpoint: 'https://waste-organisations.example/health/authorized',
          statusCode: 503,
          failure: 'http_503'
        }
      }
    })
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
    expect(report.results.AzureAdB2c).toMatchObject({
      status: 'Unhealthy',
      data: {
        downstream: {
          status: 'Not attempted',
          endpoint: 'not configured',
          failure: 'configuration'
        }
      }
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
    expect(report.results.Redis).toMatchObject({
      status: 'Unhealthy',
      data: { downstream: { failure: 'timeout' } }
    })
  })
})
