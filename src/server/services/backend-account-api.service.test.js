import { describe, expect, test, vi } from 'vitest'

const getTraceId = vi.hoisted(() => vi.fn(() => 'trace-1'))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId,
  tracing: {
    plugin: {}
  },
  withTraceId: (headerName, headers = {}) => {
    const traceId = getTraceId()
    if (traceId) {
      headers[headerName] = traceId
    }
    return headers
  }
}))

import { config } from '#/config/config.js'
import { ApiError } from '#/server/services/base/api-error.js'
import { MOCK_AUTH_ORGANISATION_ID } from '#/test-helpers/auth-test-constants.js'
import {
  BackendAccountApiService,
  createBackendAccountApiService
} from './backend-account-api.service.js'

function createService(apiFetchImpl) {
  const tokenEndpoint = 'https://login.example/oauth2/v2.0/token'

  return new BackendAccountApiService({
    baseUrl: 'http://localhost:8003/api/',
    authMode: 'bearer',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    tokenEndpoint,
    scope: 'api://resource/.default',
    cacheClient: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined)
    },
    cacheTtlMs: 300000,
    logger: { warn: vi.fn() },
    tracingHeader: 'x-cdp-request-id',
    fetchImpl: vi.fn(async (url, init) => {
      if (url === tokenEndpoint) {
        return {
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue({
            access_token: 'access-token',
            expires_in: 3600
          })
        }
      }

      return apiFetchImpl(url, init)
    })
  })
}

describe('BackendAccountApiService', () => {
  test('createBackendAccountApiService uses config defaults', () => {
    const service = createBackendAccountApiService({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      scope: 'api://resource/.default',
      tokenEndpoint: 'https://login.example/oauth2/v2.0/token',
      cacheClient: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined)
      },
      cacheTtlMs: 300000
    })

    expect(service).toBeInstanceOf(BackendAccountApiService)
    expect(service.options.baseUrl).toBe(
      config.get('backendAccountApi.baseUrl').replace(/\/$/, '')
    )
    expect(service.options.authMode).toBe(
      config.get('backendAccountApi.authMode')
    )
    expect(service.options.tracingHeader).toBe(config.get('tracing.header'))
    expect(service.options.clientId).toBe('client-id')
    expect(service.options.cacheTtlMs).toBe(300000)
  })

  test('getUserOrganisations returns parsed JSON on success', async () => {
    const payload = {
      user: {
        email: 'user@example.com',
        service: 'EPR Packaging',
        serviceRole: 'Approved Person',
        organisations: [
          {
            id: MOCK_AUTH_ORGANISATION_ID,
            name: 'Example Organisation',
            organisationNumber: '154977'
          }
        ]
      }
    }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(payload)
    })
    const service = createService(fetchImpl)

    const result = await service.getUserOrganisations(
      'a1111111-2222-3333-4444-555555555555'
    )

    expect(result).toEqual(payload)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8003/api/users/user-organisations?userId=a1111111-2222-3333-4444-555555555555',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token'
        })
      })
    )
  })

  test('getUserOrganisations throws ApiError on 404', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: vi.fn().mockReturnValue('') }
    })
    const service = createService(fetchImpl)

    await expect(
      service.getUserOrganisations('missing-user')
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 404
    })
  })

  test('getUserOrganisations rethrows non-404 errors', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: { get: vi.fn().mockReturnValue('') }
    })
    const service = createService(fetchImpl)

    await expect(service.getUserOrganisations('user-1')).rejects.toBeInstanceOf(
      ApiError
    )
  })
})
