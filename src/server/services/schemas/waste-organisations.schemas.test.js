import { describe, expect, test } from 'vitest'

import { validateApiRequest } from '#/server/services/schemas/validate-api-request.js'
import { validateApiResponse } from '#/server/services/schemas/validate-api-response.js'
import {
  organisationRegistrationUpsertRequestSchema,
  organisationSearchResponseSchema,
  registrationResponseSchema,
  registrationUpsertRequestSchema,
  wasteOrganisationSchema
} from '#/server/services/schemas/waste-organisations.schemas.js'

const wasteOrganisationsGetOrganisation = {
  id: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
  name: 'Test Name Ltd',
  tradingName: 'Trading Name',
  businessCountry: 'GB-ENG',
  companiesHouseNumber: '12345678',
  address: {
    addressLine1: 'Test Name Ltd',
    addressLine2: '123 Street',
    town: 'Town',
    county: 'County',
    postcode: 'UK1',
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

describe('waste-organisations response schemas', () => {
  test('wasteOrganisationSchema accepts GET /organisations/{id} payload', () => {
    const value = validateApiResponse(
      wasteOrganisationSchema,
      wasteOrganisationsGetOrganisation,
      'waste-organisations'
    )

    expect(value.businessCountry).toBe('GB-ENG')
    expect(value.registrations).toHaveLength(1)
  })

  test('organisationSearchResponseSchema accepts GET /organisations payload', () => {
    const value = validateApiResponse(
      organisationSearchResponseSchema,
      { organisations: [wasteOrganisationsGetOrganisation] },
      'waste-organisations'
    )

    expect(value.organisations).toHaveLength(1)
  })

  test('organisationRegistrationUpsertRequestSchema accepts PUT /organisations/{id} body', () => {
    const value = validateApiRequest(
      organisationRegistrationUpsertRequestSchema,
      {
        name: 'Acme',
        address: { addressLine1: '1 Lane' },
        registration: {
          status: 'REGISTERED',
          type: 'SMALL_PRODUCER',
          registrationYear: 2026
        }
      },
      'waste-organisations'
    )

    expect(value.registration.type).toBe('SMALL_PRODUCER')
  })

  test('organisationRegistrationUpsertRequestSchema rejects missing registration', () => {
    expect(() =>
      validateApiRequest(
        organisationRegistrationUpsertRequestSchema,
        { name: 'Acme', address: { addressLine1: '1 Lane' } },
        'waste-organisations'
      )
    ).toThrow()
  })

  test('registrationUpsertRequestSchema rejects invalid status', () => {
    expect(() =>
      validateApiRequest(
        registrationUpsertRequestSchema,
        { status: 'INVALID' },
        'waste-organisations'
      )
    ).toThrow()
  })

  test('registrationUpsertRequestSchema accepts PUT registration body', () => {
    const value = validateApiRequest(
      registrationUpsertRequestSchema,
      { status: 'REGISTERED' },
      'waste-organisations'
    )

    expect(value.status).toBe('REGISTERED')
  })

  test('registrationResponseSchema accepts PUT registration response', () => {
    const value = validateApiResponse(
      registrationResponseSchema,
      {
        status: 'REGISTERED',
        type: 'SMALL_PRODUCER',
        registrationYear: 2026
      },
      'waste-organisations'
    )

    expect(value.registrationYear).toBe(2026)
  })

  test('registrationResponseSchema accepts registration without timestamps', () => {
    const value = validateApiResponse(
      registrationResponseSchema,
      {
        status: 'REGISTERED',
        type: 'LARGE_PRODUCER',
        registrationYear: 2025
      },
      'waste-organisations'
    )

    expect(value.created).toBeUndefined()
    expect(value.updated).toBeUndefined()
  })
})
