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

function validComplianceDeclaration(overrides = {}) {
  return {
    id: '6830b9d4c7e21f5a8d3e64b2',
    created: '2026-04-20T12:28:00+00:00',
    updated: '2026-04-20T12:28:00+00:00',
    status: 'Submitted',
    organisation: {
      id: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      registrationType: 'DirectProducer',
      name: 'Org Name',
      complianceSchemeName: null,
      schemeOperatorName: null,
      referenceNumber: '123456',
      address: {
        addressLine1: '1 High Street',
        addressLine2: null,
        town: 'Bristol',
        county: null,
        postcode: 'BS1 1AA',
        country: 'UK'
      },
      regulator: 'Regulator',
      regulatorEmail: 'regulator@email.com'
    },
    obligationYear: 2026,
    obligations: [],
    obligationStatus: 'Met',
    submitterName: 'Test User',
    isRegulation43Compliant: false,
    audit: [],
    ...overrides
  }
}

function validCreateComplianceDeclarationPayload(overrides = {}) {
  return {
    organisation: {
      id: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      registrationType: 'DirectProducer',
      name: 'Org Name',
      complianceSchemeName: null,
      schemeOperatorName: null,
      referenceNumber: '123456',
      address: {
        addressLine1: '1 High Street',
        addressLine2: null,
        town: 'Bristol',
        county: null,
        postcode: 'BS1 1AA',
        country: 'UK'
      },
      regulator: 'Regulator',
      regulatorEmail: 'regulator@email.com'
    },
    obligationYear: 2026,
    obligations: [],
    obligationStatus: 'Met',
    submitterName: 'Test User',
    isWelshLanguageToggle: false,
    user: {
      id: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
      email: 'user@example.com',
      name: 'Test User'
    },
    ...overrides
  }
}

describe('WasteObligationsApiService', () => {
  test('getOrganisationObligations calls obligations endpoint with obligationYear', async () => {
    getTraceId.mockReturnValue('trace-1')

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
      2026
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
    getTraceId.mockReturnValue('trace-2')

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
      2025
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

  test('getOrganisationObligations throws when response fails schema validation', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        mockOkResponse({ obligations: [{ material: 'InvalidMaterial' }] })
      )
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
      name: 'ApiResponseValidationError',
      serviceName: 'waste-obligations'
    })
  })

  test('getComplianceDeclarations throws when response fails schema validation', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      mockOkResponse({
        complianceDeclarations: [{ id: 'not-a-mongo-id', status: 'Submitted' }]
      })
    )
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await expect(
      service.getComplianceDeclarations(
        'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        2026
      )
    ).rejects.toMatchObject({
      name: 'ApiResponseValidationError',
      serviceName: 'waste-obligations'
    })
  })

  test('getComplianceDeclaration calls single resource endpoint', async () => {
    const declaration = validComplianceDeclaration()
    const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse(declaration))
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await service.getComplianceDeclaration(
      'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      '6830b9d4c7e21f5a8d3e64b2'
    )

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8080/organisations/b6f76437-65b6-4ed2-a7d5-c50e9af76201/compliance-declarations/6830b9d4c7e21f5a8d3e64b2',
      expect.objectContaining({ method: 'GET' })
    )
  })

  test('getComplianceDeclaration throws when response fails schema validation', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      mockOkResponse({
        id: 'b5aa3ef6-e7d5-4eb2-acea-589573d5a005',
        status: 'Submitted'
      })
    )
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await expect(
      service.getComplianceDeclaration(
        'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        'b5aa3ef6-e7d5-4eb2-acea-589573d5a005'
      )
    ).rejects.toMatchObject({
      name: 'ApiResponseValidationError',
      serviceName: 'waste-obligations'
    })
  })

  test('createComplianceDeclaration throws when API returns invalid response', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        mockOkResponse({ id: 'b5aa3ef6-e7d5-4eb2-acea-589573d5a005' }, 201)
      )
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await expect(
      service.createComplianceDeclaration(
        'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        validCreateComplianceDeclarationPayload(),
        null
      )
    ).rejects.toMatchObject({
      name: 'ApiResponseValidationError',
      serviceName: 'waste-obligations'
    })
  })

  test('createComplianceDeclaration posts JSON body', async () => {
    getTraceId.mockReturnValue('trace-3')

    const created = validComplianceDeclaration()
    const fetchImpl = vi.fn().mockResolvedValue(mockOkResponse(created, 201))
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    const payload = validCreateComplianceDeclarationPayload()
    const result = await service.createComplianceDeclaration(
      'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      payload
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

  test('createComplianceDeclaration throws when request payload fails validation', async () => {
    const fetchImpl = vi.fn()
    const service = new WasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      fetchImpl
    })

    await expect(
      service.createComplianceDeclaration(
        'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        { obligationYear: 2026, submitterName: 'Test User' }
      )
    ).rejects.toMatchObject({
      name: 'ApiRequestValidationError',
      serviceName: 'waste-obligations'
    })
    expect(fetchImpl).not.toHaveBeenCalled()
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
        validCreateComplianceDeclarationPayload()
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
    expect(service.options.cacheResponses).toBe(false)
  })
})
