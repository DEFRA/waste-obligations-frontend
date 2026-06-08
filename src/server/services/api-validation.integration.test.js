import { describe, expect, test, vi } from 'vitest'

import { createBackendAccountApiService } from '#/server/services/backend-account-api.service.js'
import { createWasteObligationsApiService } from '#/server/services/waste-obligations-api.service.js'
import { createWasteOrganisationsApiService } from '#/server/services/waste-organisations-api.service.js'

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: vi.fn().mockReturnValue('application/json; charset=utf-8')
    },
    json: vi.fn().mockResolvedValue(data)
  }
}

describe('API validation integration', () => {
  test('backend account service rejects invalid user-organisations response', async () => {
    const service = createBackendAccountApiService({
      baseUrl: 'http://localhost:8003/api',
      authMode: 'basic',
      clientId: 'test',
      clientSecret: 'test',
      fetchImpl: vi.fn().mockResolvedValue(
        jsonResponse({
          user: { id: 'not-a-guid', email: 'user@example.com' }
        })
      )
    })

    await expect(service.getUserOrganisations('user-id')).rejects.toMatchObject(
      {
        name: 'ApiResponseValidationError',
        serviceName: 'backend-account'
      }
    )
  })

  test('waste obligations service rejects invalid obligations list response', async () => {
    const service = createWasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      authMode: 'basic',
      clientId: 'test',
      clientSecret: 'test',
      fetchImpl: vi
        .fn()
        .mockResolvedValue(jsonResponse({ obligations: 'not-an-array' }))
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

  test('waste obligations service rejects invalid create declaration response', async () => {
    const service = createWasteObligationsApiService({
      baseUrl: 'http://localhost:8080',
      authMode: 'basic',
      clientId: 'test',
      clientSecret: 'test',
      fetchImpl: vi
        .fn()
        .mockResolvedValue(jsonResponse({ id: 'uuid-not-mongo' }, 201))
    })

    await expect(
      service.createComplianceDeclaration(
        'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        {
          organisation: {
            id: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
            registrationType: 'DirectProducer',
            regulator: 'EA',
            regulatorEmail: 'ea@example.com'
          },
          obligationYear: 2026,
          obligations: [],
          obligationStatus: 'Met',
          declarationText: { text: 'x', language: 'en' },
          submitterName: 'User',
          user: {
            id: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
            email: 'user@example.com'
          }
        }
      )
    ).rejects.toMatchObject({
      name: 'ApiResponseValidationError',
      serviceName: 'waste-obligations'
    })
  })

  test('waste organisations service rejects invalid upsert request before fetch', async () => {
    const fetchImpl = vi.fn()
    const service = createWasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      authMode: 'basic',
      clientId: 'test',
      clientSecret: 'test',
      fetchImpl
    })

    await expect(
      service.upsertOrganisation('b6f76437-65b6-4ed2-a7d5-c50e9af76201', {
        name: 'Acme'
      })
    ).rejects.toMatchObject({
      name: 'ApiRequestValidationError',
      serviceName: 'waste-organisations'
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('waste organisations service accepts valid organisation GET response', async () => {
    const organisation = {
      id: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      name: 'Test Name Ltd',
      tradingName: null,
      businessCountry: 'GB-ENG',
      companiesHouseNumber: '12345678',
      address: {
        addressLine1: '1 High Street',
        addressLine2: null,
        town: 'Bristol',
        county: null,
        postcode: 'BS1 1AA',
        country: 'UK'
      },
      registrations: [
        {
          created: '2026-04-30T13:38:00+00:00',
          updated: '2026-04-30T13:38:00+00:00',
          status: 'REGISTERED',
          type: 'SMALL_PRODUCER',
          registrationYear: 2025
        }
      ]
    }
    const service = createWasteOrganisationsApiService({
      baseUrl: 'http://localhost:9090',
      authMode: 'basic',
      clientId: 'test',
      clientSecret: 'test',
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse(organisation))
    })

    const result = await service.getOrganisation(
      'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
    )

    expect(result.name).toBe('Test Name Ltd')
  })
})
