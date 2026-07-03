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
    expect(service.options.cacheResponses).toBe(false)
  })

  test('getUserOrganisations returns parsed JSON on success', async () => {
    const payload = {
      user: {
        id: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        firstName: 'Test',
        lastName: 'User',
        email: 'user@example.com',
        roleInOrganisation: 'Admin',
        enrolmentStatus: 'Approved',
        service: 'EPR Packaging',
        serviceRole: 'Approved Person',
        serviceRoleId: 1,
        telephone: '07123456789',
        jobTitle: 'Director',
        isChangeRequestPending: false,
        numberOfOrganisations: 1,
        organisations: [
          {
            id: 'e2316c5e-d434-41da-8274-494dc0762d20',
            name: 'Test Organisation Ltd',
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

  test('getUserOrganisations throws when response has no user object', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ user: null })
    })
    const service = createService(fetchImpl)

    await expect(service.getUserOrganisations('user-1')).rejects.toMatchObject({
      name: 'ApiResponseValidationError',
      serviceName: 'backend-account'
    })
  })

  test('getUserOrganisations throws when user payload fails schema validation', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        user: {
          id: 'not-a-guid',
          firstName: 'Test',
          lastName: 'User',
          email: 'user@example.com',
          roleInOrganisation: 'Admin',
          enrolmentStatus: 'Approved',
          service: 'EPR Packaging',
          serviceRole: 'Approved Person',
          serviceRoleId: 1,
          isChangeRequestPending: false,
          numberOfOrganisations: 0,
          organisations: []
        }
      })
    })
    const service = createService(fetchImpl)

    await expect(service.getUserOrganisations('user-1')).rejects.toMatchObject({
      name: 'ApiResponseValidationError',
      serviceName: 'backend-account'
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

  test('getComplianceSchemesForOperator returns parsed JSON on success', async () => {
    const payload = [
      {
        id: 'd93376e3-0681-46be-aeb4-7450a2e784d8',
        name: 'Compliance Scheme Name',
        rowNumber: 1,
        createdOn: '2026-01-01T00:00:00Z',
        nationId: 1
      }
    ]
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(payload)
    })
    const service = createService(fetchImpl)

    const result = await service.getComplianceSchemesForOperator(
      'e2316c5e-d434-41da-8274-494dc0762d20'
    )

    expect(result).toEqual(payload)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8003/api/compliance-schemes/get-for-operator?organisationId=e2316c5e-d434-41da-8274-494dc0762d20',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token'
        })
      })
    )
  })

  test('getComplianceSchemesForOperator throws ApiError on 404', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: vi.fn().mockReturnValue('') }
    })
    const service = createService(fetchImpl)

    await expect(
      service.getComplianceSchemesForOperator('missing-organisation')
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 404
    })
  })
})
