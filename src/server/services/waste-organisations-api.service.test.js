import { describe, expect, test, vi } from 'vitest'

import {
  createWasteOrganisationsApiService,
  WasteOrganisationsApiService
} from './waste-organisations-api.service.js'
import { ApiRequestError } from './base/base-api.service.js'

function mockOkResponse(data) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data)
  }
}

function mockCacheClient() {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK')
  }
}

describe('WasteOrganisationsApiService', () => {
  test('getOrganisation calls organisation endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse({ id: 'org-1' }))
    const cacheClient = mockCacheClient()
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090/',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      cacheClient,
      fetchImpl
    })

    await service.getOrganisation('org-1', 'trace-123')

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
    expect(cacheClient.set).toHaveBeenCalled()
  })

  test('getOrganisation returns cached value when available', async () => {
    const fetchImpl = vi.fn()
    const cacheClient = {
      get: vi
        .fn()
        .mockResolvedValue(JSON.stringify({ id: 'org-1', cached: true })),
      set: vi.fn()
    }
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      cacheClient,
      fetchImpl
    })

    const organisation = await service.getOrganisation('org-1')

    expect(organisation).toEqual({ id: 'org-1', cached: true })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(cacheClient.set).not.toHaveBeenCalled()
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
    const cacheClient = mockCacheClient()
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      cacheClient,
      fetchImpl
    })

    await expect(service.getOrganisation('org-1')).rejects.toBeInstanceOf(
      ApiRequestError
    )
    await expect(service.getOrganisation('org-1')).rejects.toThrow(
      'waste-organisations API request failed with status 500'
    )
    await expect(service.getOrganisation('org-1')).rejects.toMatchObject({
      status: 500,
      title: 'Internal Server Error',
      detail: 'upstream failed',
      traceId: 'trace-500'
    })
  })

  test('rethrows non-status errors from getOrganisation', async () => {
    const cacheClient = mockCacheClient()
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      cacheClient,
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
      cacheClient: mockCacheClient(),
      fetchImpl: vi.fn()
    })

    expect(service).toBeInstanceOf(WasteOrganisationsApiService)
  })
})
