import { describe, expect, test } from 'vitest'

import { validateApiResponse } from '#/server/services/schemas/validate-api-response.js'
import { validateApiRequest } from '#/server/services/schemas/validate-api-request.js'
import {
  complianceDeclarationSchema,
  createComplianceDeclarationRequestSchema,
  organisationComplianceDeclarationsResponseSchema,
  organisationObligationsResponseSchema
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
  declarationText: {
    text: 'This is the text',
    language: 'en'
  },
  submitterName: 'Submitter Name',
  isRegulation43Compliant: true,
  audit: [
    {
      user: {
        id: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
        email: 'submitter@email.com'
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
  declarationText: {
    text: 'Declaration text',
    language: 'en'
  },
  submitterName: 'Submitter Name',
  user: {
    id: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
    email: 'submitter@email.com'
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

  test('createComplianceDeclarationRequestSchema rejects invalid obligation year', () => {
    expect(() =>
      validateApiRequest(
        createComplianceDeclarationRequestSchema,
        { ...createComplianceDeclarationRequest, obligationYear: 2022 },
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
