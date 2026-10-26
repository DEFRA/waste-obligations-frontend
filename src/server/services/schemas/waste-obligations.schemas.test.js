import { describe, expect, test } from 'vitest'

import { validateApiResponse } from '#/server/services/schemas/validate-api-response.js'
import { validateApiRequest } from '#/server/services/schemas/validate-api-request.js'
import {
  complianceDeclarationSchema,
  createComplianceDeclarationRequestSchema,
  MAX_PRN_STATUS_UPDATES,
  organisationComplianceDeclarationsResponseSchema,
  organisationObligationsResponseSchema,
  updatePrnStatusesRequestSchema
} from '#/server/services/schemas/waste-obligations.schemas.js'

const organisationObligationsResponse = {
  obligations: [
    {
      material: 'Plastic',
      recyclingTarget: 0.75,
      tonnages: {
        material: 100,
        awaitingAcceptance: 10,
        accepted: 2,
        outstanding: 0,
        obligated: 0
      },
      status: 'NoDataYet'
    },
    {
      material: 'Paper',
      recyclingTarget: 0.75,
      tonnages: {
        material: 100,
        awaitingAcceptance: 10,
        accepted: 2,
        outstanding: 198,
        obligated: 200
      },
      status: 'NotMet'
    }
  ]
}

const obligationsOrganisation = {
  id: '923fa611-571c-4948-ab7d-fbb75e75ed65',
  registrationType: 'DirectProducer',
  name: 'Org Name',
  complianceSchemeName: null,
  schemeOperatorName: null,
  referenceNumber: '123456',
  address: {
    addressLine1: 'Test Name Ltd',
    addressLine2: '123 Street',
    town: 'Town',
    county: 'County',
    postcode: 'UK1',
    country: 'UK'
  },
  regulator: 'Regulator',
  regulatorEmail: 'regulator@email.com'
}

const complianceDeclarationCreated = {
  id: '6830b9d4c7e21f5a8d3e64b2',
  created: '2026-04-20T12:28:00+00:00',
  updated: '2026-04-20T12:28:00+00:00',
  status: 'Submitted',
  organisation: obligationsOrganisation,
  obligationYear: 2026,
  obligations: [
    {
      material: 'Plastic',
      recyclingTarget: 0.75,
      tonnages: {
        material: 100,
        awaitingAcceptance: 10,
        accepted: 2,
        outstanding: 20,
        obligated: 5
      },
      status: 'NoDataYet'
    }
  ],
  obligationStatus: 'NotMet',
  submitterName: 'Submitter Name',
  isRegulation43Compliant: true,
  audit: [
    {
      user: {
        id: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
        email: 'submitter@email.com',
        name: 'Account User Name'
      },
      timestamp: '2026-04-26T14:00:00+00:00',
      action: 'Submitted'
    }
  ]
}

const createComplianceDeclarationRequest = {
  organisation: obligationsOrganisation,
  obligationYear: 2026,
  obligations: organisationObligationsResponse.obligations,
  obligationStatus: 'Met',
  submitterName: 'Submitter Name',
  user: {
    id: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
    email: 'submitter@email.com',
    name: 'Account User Name',
    locale: 'en'
  },
  isRegulation43Compliant: false
}

describe('waste-obligations request schemas', () => {
  test('createComplianceDeclarationRequestSchema accepts POST create payload', () => {
    const value = validateApiRequest(
      createComplianceDeclarationRequestSchema,
      createComplianceDeclarationRequest,
      'waste-obligations'
    )

    expect(value.obligationYear).toBe(2026)
    expect(value.organisation.registrationType).toBe('DirectProducer')
  })

  test('createComplianceDeclarationRequestSchema rejects payload without registrationType', () => {
    const { registrationType: _removed, ...organisationWithoutType } =
      obligationsOrganisation

    expect(() =>
      validateApiRequest(
        createComplianceDeclarationRequestSchema,
        {
          ...createComplianceDeclarationRequest,
          organisation: {
            ...organisationWithoutType,
            regulator: 'Regulator',
            regulatorEmail: 'regulator@email.com'
          }
        },
        'waste-obligations'
      )
    ).toThrow()
  })

  test('createComplianceDeclarationRequestSchema rejects missing user name', () => {
    const { name: _removed, ...userWithoutName } =
      createComplianceDeclarationRequest.user

    expect(() =>
      validateApiRequest(
        createComplianceDeclarationRequestSchema,
        {
          ...createComplianceDeclarationRequest,
          user: userWithoutName
        },
        'waste-obligations'
      )
    ).toThrow()
  })

  test('createComplianceDeclarationRequestSchema rejects missing organisation', () => {
    expect(() =>
      validateApiRequest(
        createComplianceDeclarationRequestSchema,
        {
          obligationYear: 2026,
          obligationStatus: 'Met',
          submitterName: 'User',
          user: createComplianceDeclarationRequest.user
        },
        'waste-obligations'
      )
    ).toThrow()
  })

  test('createComplianceDeclarationRequestSchema rejects invalid obligation year', () => {
    expect(() =>
      validateApiRequest(
        createComplianceDeclarationRequestSchema,
        { ...createComplianceDeclarationRequest, obligationYear: 2022 },
        'waste-obligations'
      )
    ).toThrow()
  })

  test('createComplianceDeclarationRequestSchema accepts certificate submit shaped payload', () => {
    const value = validateApiRequest(
      createComplianceDeclarationRequestSchema,
      {
        organisation: {
          id: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
          registrationType: 'DirectProducer',
          name: 'Example Org',
          referenceNumber: '100003',
          address: { addressLine1: '1 Lane' },
          complianceSchemeName: null,
          schemeOperatorName: null,
          regulator: 'Environment Agency',
          regulatorEmail: 'packagingproducers@environment-agency.gov.uk'
        },
        obligations: organisationObligationsResponse.obligations,
        obligationYear: 2026,
        obligationStatus: 'Met',
        submitterName: 'Jane Doe',
        user: {
          id: 'a1111111-2222-3333-4444-555555555555',
          email: 'user@example.com',
          name: 'Test User',
          locale: 'cy'
        }
      },
      'waste-obligations'
    )

    expect(value.organisation.id).toBe('b6f76437-65b6-4ed2-a7d5-c50e9af76201')
    expect(value.organisation.registrationType).toBe('DirectProducer')
    expect(value.user.locale).toBe('cy')
  })

  test('createComplianceDeclarationRequestSchema rejects missing user locale', () => {
    const { locale: _removed, ...userWithoutLocale } =
      createComplianceDeclarationRequest.user

    expect(() =>
      validateApiRequest(
        createComplianceDeclarationRequestSchema,
        {
          organisation: createComplianceDeclarationRequest.organisation,
          obligationYear: 2026,
          obligations: createComplianceDeclarationRequest.obligations,
          obligationStatus: 'Met',
          submitterName: 'Submitter Name',
          user: userWithoutLocale
        },
        'waste-obligations'
      )
    ).toThrow()
  })

  test('createComplianceDeclarationRequestSchema rejects null user locale', () => {
    expect(() =>
      validateApiRequest(
        createComplianceDeclarationRequestSchema,
        {
          ...createComplianceDeclarationRequest,
          user: {
            ...createComplianceDeclarationRequest.user,
            locale: null
          }
        },
        'waste-obligations'
      )
    ).toThrow()
  })
})

describe('waste-obligations response schemas', () => {
  test('organisationObligationsResponseSchema accepts GET obligations payload', () => {
    const value = validateApiResponse(
      organisationObligationsResponseSchema,
      organisationObligationsResponse,
      'waste-obligations'
    )

    expect(value.obligations).toHaveLength(2)
  })

  test('complianceDeclarationSchema accepts POST create response', () => {
    const value = validateApiResponse(
      complianceDeclarationSchema,
      complianceDeclarationCreated,
      'waste-obligations'
    )

    expect(value.id).toBe('6830b9d4c7e21f5a8d3e64b2')
  })

  test('complianceDeclarationSchema accepts null audit user locale', () => {
    const value = validateApiResponse(
      complianceDeclarationSchema,
      {
        ...complianceDeclarationCreated,
        audit: [
          {
            ...complianceDeclarationCreated.audit[0],
            user: {
              ...complianceDeclarationCreated.audit[0].user,
              locale: null
            }
          }
        ]
      },
      'waste-obligations'
    )

    expect(value.audit[0].user.locale).toBeNull()
  })

  test('complianceDeclarationSchema accepts OpenAPI minimum required fields', () => {
    const value = validateApiResponse(
      complianceDeclarationSchema,
      {
        id: '6830b9d4c7e21f5a8d3e64b2',
        organisation: obligationsOrganisation,
        obligationYear: 2026,
        obligationStatus: 'Met',
        submitterName: 'Submitter Name'
      },
      'waste-obligations'
    )

    expect(value.status).toBeUndefined()
    expect(value.obligations).toEqual([])
    expect(value.audit).toEqual([])
  })

  test('organisationComplianceDeclarationsResponseSchema accepts list payload', () => {
    const value = validateApiResponse(
      organisationComplianceDeclarationsResponseSchema,
      { complianceDeclarations: [complianceDeclarationCreated] },
      'waste-obligations'
    )

    expect(value.complianceDeclarations[0].status).toBe('Submitted')
  })

  test('complianceDeclarationSchema rejects UUID ids (Mongo ObjectId only)', () => {
    expect(() =>
      validateApiResponse(
        complianceDeclarationSchema,
        {
          ...complianceDeclarationCreated,
          id: 'b5aa3ef6-e7d5-4eb2-acea-589573d5a005'
        },
        'waste-obligations'
      )
    ).toThrow(/id/)
  })
})

describe('bulk PRN status update request schema', () => {
  const user = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'User',
    locale: 'en'
  }
  const prnId = '8ad261c9-d1a0-4e1a-8b1f-d38fe29fe508'
  const requestWith = (prnIds) => ({ status: 'ACCEPTED', user, prnIds })
  const validate = (prnIds) =>
    validateApiRequest(
      updatePrnStatusesRequestSchema,
      requestWith(prnIds),
      'api'
    )

  test('accepts hyphenated PRN IDs in lower or upper case', () => {
    expect(() => validate([prnId, prnId.toUpperCase()])).not.toThrow()
  })

  test.each([
    ['hyphen-free', prnId.replace(/-/g, '')],
    ['braced', `{${prnId}}`],
    ['URN', `urn:uuid:${prnId}`]
  ])('rejects a %s PRN ID', (_, id) => {
    expect(() => validate([id])).toThrow(/fails to match the required pattern/)
  })

  test('accepts exactly the maximum number of PRN IDs', () => {
    const prnIds = Array.from({ length: MAX_PRN_STATUS_UPDATES }, () => prnId)

    expect(() => validate(prnIds)).not.toThrow()
  })

  test('rejects one more PRN ID than the maximum', () => {
    const prnIds = Array.from(
      { length: MAX_PRN_STATUS_UPDATES + 1 },
      () => prnId
    )

    expect(() => validate(prnIds)).toThrow(
      /must contain less than or equal to 100 items/
    )
  })

  test('rejects an empty list of PRN IDs', () => {
    expect(() => validate([])).toThrow(/must contain at least 1 items/)
  })
})
