import { describe, expect, test, vi } from 'vitest'

const getTraceId = vi.hoisted(() => vi.fn(() => null))

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

import {
  createWasteOrganisationsApiService,
  WasteOrganisationsApiService
} from './waste-organisations-api.service.js'

function mockOkResponse(data) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data)
  }
}

describe('WasteOrganisationsApiService', () => {
  test('getOrganisation calls organisation endpoint', async () => {
    getTraceId.mockReturnValue('trace-123')

    const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse({ id: 'org-1' }))
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090/',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.getOrganisation('org-1')

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/organisations/org-1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: expect.stringMatching(/^Basic /),
          'x-cdp-request-id': 'trace-123'
        })
      })
    )
  })

  test('throws when API responds with non-success status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue({
        type: 'https://tools.ietf.org/html/rfc9110#section-15.6.1',
        title: 'Internal Server Error',
        status: 500,
        detail: 'upstream failed',
        traceId: 'trace-500'
      })
    })
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await expect(service.getOrganisation('org-1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      title: 'Internal Server Error',
      detail: 'upstream failed',
      traceId: 'trace-500',
      message: 'waste-organisations API request failed with status 500'
    })
  })

  test('searchOrganisations builds query string and GETs /organisations', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ organisations: [] }))
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    getTraceId.mockReturnValue('t-1')

    await service.searchOrganisations({
      registrations: 'SMALL_PRODUCER',
      registrationYears: '2026',
      statuses: 'REGISTERED'
    })

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/organisations?registrations=SMALL_PRODUCER&registrationYears=2026&statuses=REGISTERED',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-cdp-request-id': 't-1'
        })
      })
    )
  })

  test('searchOrganisations treats undefined filters as empty', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ organisations: [] }))
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.searchOrganisations(undefined)

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/organisations',
      expect.objectContaining({ method: 'GET' })
    )
  })

  test('searchOrganisations omits query when filters empty', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ organisations: [] }))
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.searchOrganisations({})

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/organisations',
      expect.objectContaining({ method: 'GET' })
    )
  })

  test('upsertOrganisation sends PUT with JSON body', async () => {
    const body = {
      name: 'Acme',
      address: { addressLine1: '1 Lane' },
      registration: {
        status: 'REGISTERED',
        type: 'SMALL_PRODUCER',
        registrationYear: 2026
      }
    }
    const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse({ id: 'guid' }))
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.upsertOrganisation(
      'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      body
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/organisations/b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(body),
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    )
  })

  test('upsertOrganisationRegistration sends PUT to registrations path', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ status: 'REGISTERED' }))
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.upsertOrganisationRegistration(
      'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      'SMALL_PRODUCER',
      2026,
      { status: 'REGISTERED' }
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/organisations/b6f76437-65b6-4ed2-a7d5-c50e9af76201/registrations/SMALL_PRODUCER-2026',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ status: 'REGISTERED' })
      })
    )
  })

  test('deleteOrganisationRegistration sends DELETE', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: {
        get: vi.fn().mockReturnValue('')
      },
      json: vi.fn()
    })
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    const result = await service.deleteOrganisationRegistration(
      'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      'SMALL_PRODUCER',
      2026
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/organisations/b6f76437-65b6-4ed2-a7d5-c50e9af76201/registrations/SMALL_PRODUCER-2026',
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(result).toBeNull()
  })

  test('rethrows non-status errors from getOrganisation', async () => {
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl: vi.fn()
    })
    vi.spyOn(service, 'getJson').mockRejectedValue(new Error('network-down'))

    await expect(service.getOrganisation('org-1')).rejects.toThrow(
      'network-down'
    )
  })

  test('createWasteOrganisationsApiService creates service instance', () => {
    const service = createWasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl: vi.fn()
    })

    expect(service).toBeInstanceOf(WasteOrganisationsApiService)
    expect(service.options.cacheResponses).toBe(false)
  })
})
