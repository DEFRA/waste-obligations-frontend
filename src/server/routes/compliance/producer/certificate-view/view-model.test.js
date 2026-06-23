import { describe, expect, test } from 'vitest'

import { buildCertificateSubmitDeclarationText } from '../certificate-submit/utils.js'
import { formatCertificateSubmitDeclarationApiText } from '../certificate-submit/utils.js'
import { buildCertificateViewModel } from './view-model.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

const obligations = [
  {
    material: 'Aluminium',
    tonnages: {
      obligated: 292,
      awaitingAcceptance: 0,
      accepted: 292,
      outstanding: 0
    },
    status: 'Met'
  },
  {
    material: 'Glass',
    tonnages: {
      obligated: 0,
      awaitingAcceptance: 0,
      accepted: 0,
      outstanding: 0
    },
    status: 'Met'
  },
  {
    material: 'GlassRemelt',
    tonnages: {
      obligated: 0,
      awaitingAcceptance: 0,
      accepted: 0,
      outstanding: 0
    },
    status: 'Met'
  }
]

function buildDeclaration(overrides = {}) {
  const declarationText = buildCertificateSubmitDeclarationText(
    'en',
    'Petrie and Tew Limited'
  )

  return {
    id: '6830b9d4c7e21f5a8d3e64b2',
    created: '2026-04-02T14:00:00+00:00',
    updated: '2026-04-02T14:00:00+00:00',
    obligationYear: 2026,
    obligationStatus: 'Met',
    obligations,
    declarationText: {
      text: formatCertificateSubmitDeclarationApiText(declarationText),
      language: 'en'
    },
    submitterName: 'Typed Name',
    organisation: {
      id: organisationId,
      name: 'Petrie and Tew Limited',
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

describe('buildCertificateViewModel', () => {
  test('builds certificate view model from compliance declaration', () => {
    const model = buildCertificateViewModel({
      declaration: buildDeclaration(),
      user: { firstName: 'Your', lastName: 'Name' }
    })

    expect(model).toMatchObject({
      year: 2026,
      organisationName: 'Petrie and Tew Limited',
      organisationNumber: '123456',
      organisationAddress: 'Pixash Lane, Keynsham, Bristol, BS31 1TP',
      nameOnAccount: 'Your Name',
      submissionDate: '2 April 2026',
      regulatorName: 'Environment Agency',
      obligationStatus: 'Met',
      submitterName: 'Typed Name'
    })
    expect(model.declarationText.intro).toEqual(expect.any(String))
    expect(model.declarationText.bullets).toHaveLength(3)
    expect(model.obligationsRows.at(-1).materialKey).toBe(
      'compliance.certificateSubmit.table.totalsRow'
    )
  })

  test('returns null when declaration is missing', () => {
    expect(
      buildCertificateViewModel({
        declaration: null,
        user: { firstName: 'Your', lastName: 'Name' }
      })
    ).toBeNull()
  })

  test('uses overall obligation status when declaration status is missing', () => {
    const notMetObligations = [
      {
        material: 'Wood',
        tonnages: {
          obligated: 100,
          awaitingAcceptance: 0,
          accepted: 0,
          outstanding: 100
        },
        status: 'NotMet'
      }
    ]

    const model = buildCertificateViewModel({
      declaration: buildDeclaration({
        obligationStatus: undefined,
        obligations: notMetObligations
      }),
      user: { firstName: 'Your', lastName: 'Name' }
    })

    expect(model.obligationStatus).toBe('NotMet')

    const woodRow = model.obligationsRows.find((row) => row.material === 'Wood')
    expect(woodRow.tag).toEqual({
      variant: 'yellow',
      i18nKey: 'compliance.certificateView.obligationStatus.notMet'
    })
    expect(
      model.obligationsTableRows.some((row) => row[5].html.includes('Not met'))
    ).toBe(true)
  })

  test('formats submission date from created when updated is missing', () => {
    const model = buildCertificateViewModel({
      declaration: buildDeclaration({
        created: '2026-03-15T09:30:00+00:00',
        updated: undefined,
        declarationText: {
          text: formatCertificateSubmitDeclarationApiText(
            buildCertificateSubmitDeclarationText(
              'en',
              'Petrie and Tew Limited'
            )
          ),
          language: 'cy'
        }
      }),
      user: { firstName: 'Your', lastName: 'Name' }
    })

    expect(model.submissionDate).toBe('15 March 2026')
    expect(model.glassTableRows.length).toBeGreaterThan(0)
    expect(model.glassRows[0].obligationToMeet).toBe('0')
  })
})
