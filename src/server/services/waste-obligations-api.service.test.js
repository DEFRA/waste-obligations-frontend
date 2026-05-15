import { describe, expect, test, vi } from 'vitest'

import {
  createWasteObligationsApiService,
  WasteObligationsApiService
} from './waste-obligations-api.service.js'

function mockOkResponse(data, status = 200) {
  return {
    ok: true,
    status,
    headers: {
      get: vi.fn().mockReturnValue('application/json; charset=utf-8')
    },
    json: vi.fn().mockResolvedValue(data)
  }
}

describe('WasteObligationsApiService', () => {
  test('getOrganisationObligations calls obligations endpoint with obligationYear', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ obligations: [] }))
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080/',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.getOrganisationObligations(
      'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      2026,
      'trace-1'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/organisations/b6f76437-65b6-4ed2-a7d5-c50e9af76201/obligations?obligationYear=2026',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: expect.stringMatching(/^Basic /),
          'x-cdp-request-id': 'trace-1'
        })
      })
    )
  })

  test('getOrganisationObligations omits query when obligationYear is undefined', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ obligations: [] }))
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.getOrganisationObligations(
      'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/organisations/b6f76437-65b6-4ed2-a7d5-c50e9af76201/obligations',
      expect.any(Object)
    )
  })

  test('getComplianceDeclarations omits query when obligationYear is undefined', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ complianceDeclarations: [] }))
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.getComplianceDeclarations(
      'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/organisations/b6f76437-65b6-4ed2-a7d5-c50e9af76201/compliance-declarations',
      expect.any(Object)
    )
  })

  test('getComplianceDeclarations calls list endpoint with query', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(mockOkResponse({ complianceDeclarations: [] }))
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.getComplianceDeclarations(
      'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      2025,
      'trace-2'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/organisations/b6f76437-65b6-4ed2-a7d5-c50e9af76201/compliance-declarations?obligationYear=2025',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-cdp-request-id': 'trace-2'
        })
      })
    )
  })

  test('getComplianceDeclaration calls single resource endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse({ id: 'cd-1' }))
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.getComplianceDeclaration(
      'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      'a1b2c3d4-e5f6-4789-a012-3456789abcde',
      null
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/organisations/b6f76437-65b6-4ed2-a7d5-c50e9af76201/compliance-declarations/a1b2c3d4-e5f6-4789-a012-3456789abcde',
      expect.objectContaining({ method: 'GET' })
    )
  })

  test('createComplianceDeclaration posts JSON body', async () => {
    const created = { id: 'new-declaration' }
    const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse(created, 201))
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    const payload = { obligationYear: 2026, submitterName: 'Test User' }
    const result = await service.createComplianceDeclaration(
      'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      payload,
      'trace-3'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/organisations/b6f76437-65b6-4ed2-a7d5-c50e9af76201/compliance-declarations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-cdp-request-id': 'trace-3'
        }),
        body: JSON.stringify(payload)
      })
    )
    expect(result).toEqual(created)
  })

  test('createComplianceDeclaration throws on failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue({
        title: 'Bad Request',
        status: 400
      })
    })
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await expect(
      service.createComplianceDeclaration(
        'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        {},
        null
      )
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      title: 'Bad Request',
      message: 'waste-obligations API request failed with status 400'
    })
  })

  test('throws when API responds with non-success status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue({
        type: 'https://tools.ietf.org/html/rfc9110#section-15.5.5',
        title: 'Not Found',
        status: 404
      })
    })
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await expect(
      service.getOrganisationObligations(
        'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        2026
      )
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      title: 'Not Found',
      message: 'waste-obligations API request failed with status 404'
    })
  })

  test('createWasteObligationsApiService creates service instance', () => {
    const service = createWasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl: vi.fn()
    })

    expect(service).toBeInstanceOf(WasteObligationsApiService)
  })
})
