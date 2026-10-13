import { describe, expect, test } from 'vitest'

import { buildStatementViewModel } from './view-model.js'

const schemeId = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890'

const obligations = [
  {
    material: 'Plastic',
    tonnages: {
      obligated: 75,
      awaitingAcceptance: 0,
      accepted: 75,
      outstanding: 0
    },
    status: 'Met'
  }
]

function buildDeclaration(overrides = {}) {
  return {
    id: '6830b9d4c7e21f5a8d3e64b2',
    created: '2026-04-02T14:00:00+00:00',
    updated: '2026-04-02T14:00:00+00:00',
    obligationYear: 2026,
    obligationStatus: 'Met',
    isRegulation43Compliant: true,
    obligations,
    submitterName: 'Typed Name',
    audit: [
      {
        action: 'Submitted',
        user: {
          id: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
          email: 'account@example.com',
          name: 'Account Holder Name'
        },
        timestamp: '2026-04-02T14:00:00+00:00'
      }
    ],
    organisation: {
      id: schemeId,
      complianceSchemeName: 'Example Compliance Scheme',
      schemeOperatorName: 'Scheme Operator Ltd',
      referenceNumber: '123456',
      address: {
        addressLine1: 'Pixash Lane',
        town: 'Keynsham',
        county: 'Bristol',
        postcode: 'BS31 1TP'
      },
      regulator: 'Environment Agency'
    },
    ...overrides
  }
}

describe('buildStatementViewModel', () => {
  test('builds statement view model from compliance declaration', () => {
    const model = buildStatementViewModel({
      declaration: buildDeclaration()
    })

    expect(model).toMatchObject({
      year: 2026,
      complianceSchemeName: 'Example Compliance Scheme',
      schemeOperatorName: 'Scheme Operator Ltd',
      organisationNumber: '123456',
      organisationAddress: 'Pixash Lane, Keynsham, Bristol, BS31 1TP',
      nameOnAccount: 'Account Holder Name',
      submissionDate: '2 April 2026',
      regulatorName: 'Environment Agency',
      obligationStatus: 'Met',
      submitterName: 'Typed Name',
      complianceStatus: {
        variant: 'met',
        straplineKey: 'obligationsMetCompliedStrapline',
        subtextKey: 'obligationsMetCompliedSubtext'
      }
    })
  })

  test('returns null when declaration is missing', () => {
    expect(buildStatementViewModel({ declaration: null })).toBeNull()
  })

  test('uses not-met compliance status when regulation 43 is not complied', () => {
    const model = buildStatementViewModel({
      declaration: buildDeclaration({
        isRegulation43Compliant: false
      })
    })

    expect(model.complianceStatus).toEqual({
      variant: 'not-met',
      straplineKey: 'notCompliantReg43Strapline',
      subtextKey: 'obligationsMetReg43NotCompliedSubtext'
    })
  })

  test('falls back to empty organisation fields when missing', () => {
    const model = buildStatementViewModel({
      declaration: buildDeclaration({
        organisation: {
          id: schemeId,
          complianceSchemeName: undefined,
          schemeOperatorName: undefined,
          referenceNumber: undefined,
          address: {
            addressLine1: 'Pixash Lane',
            town: 'Keynsham',
            postcode: 'BS31 1TP'
          },
          regulator: 'Environment Agency'
        }
      })
    })

    expect(model.complianceSchemeName).toBe('')
    expect(model.schemeOperatorName).toBe('')
    expect(model.organisationNumber).toBe('')
  })
})
