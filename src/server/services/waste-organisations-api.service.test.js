import { describe, expect, test, vi } from 'vitest'

import { WasteOrganisationsApiService } from './waste-organisations-api.service.js'

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

    await service.getOrganisation('org-1')

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/organisations/org-1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: expect.stringMatching(/^Basic /)
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
      status: 500
    })
    const cacheClient = mockCacheClient()
    const service = new WasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      cacheClient,
      fetchImpl
    })

    await expect(service.getOrganisation('org-1')).rejects.toThrow(
      'Waste Organisations API request failed with status 500'
    )
  })
})
