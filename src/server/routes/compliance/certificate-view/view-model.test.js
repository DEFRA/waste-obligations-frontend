import { describe, expect, test } from 'vitest'

import { buildCertificateSubmitDeclarationText } from '../certificate-submit/utils.js'
import { formatCertificateSubmitDeclarationApiText } from '../certificate-submit/utils.js'
import { buildCertificateViewModel } from './view-model.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

const organisation = {
  id: organisationId,
  name: 'Petrie and Tew Limited',
  businessCountry: 'GB-ENG',
  address: {
    addressLine1: 'Pixash Lane',
    town: 'Keynsham',
    county: 'Bristol',
    postcode: 'BS31 1TP'
  },
  registrations: [
    {
      type: 'LARGE_PRODUCER',
      status: 'REGISTERED',
      registrationYear: 2026,
      updated: '2026-05-18T11:20:00Z'
    }
  ]
}

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

describe('buildCertificateViewModel', () => {
  test('builds certificate view model from latest declaration', () => {
    const declarationText = buildCertificateSubmitDeclarationText(
      'en',
      'Petrie and Tew Limited'
    )

    const model = buildCertificateViewModel({
      declarations: [
        {
          id: 'older',
          created: '2026-01-01T10:00:00Z',
          obligationYear: 2026,
          obligationStatus: 'Met',
          obligations,
          declarationText: {
            text: formatCertificateSubmitDeclarationApiText(declarationText),
            language: 'en'
          },
          submitterName: 'Typed Name'
        },
        {
          id: 'newer',
          created: '2026-04-02T14:00:00+00:00',
          updated: '2026-04-02T14:00:00+00:00',
          obligationYear: 2026,
          obligationStatus: 'Met',
          obligations,
          declarationText: {
            text: formatCertificateSubmitDeclarationApiText(declarationText),
            language: 'en'
          },
          submitterName: 'Typed Name'
        }
      ],
      organisation,
      currentOrganisation: { organisationNumber: '123456' },
      user: { firstName: 'Your', lastName: 'Name' },
      year: 2026
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
    expect(model.declarationText.bullets.length).toBe(3)
    expect(model.obligationsRows.at(-1).materialKey).toBe(
      'compliance.certificateSubmit.table.totalsRow'
    )
  })

  test('returns null when no declaration exists for the year', () => {
    expect(
      buildCertificateViewModel({
        declarations: [],
        organisation,
        currentOrganisation: { organisationNumber: '123456' },
        user: { firstName: 'Your', lastName: 'Name' },
        year: 2026
      })
    ).toBeNull()
  })

  test('uses overall obligation status when declaration status is missing', () => {
    const declarationText = buildCertificateSubmitDeclarationText(
      'en',
      'Petrie and Tew Limited'
    )
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
      declarations: [
        {
          id: 'declaration-1',
          created: '2026-04-02T14:00:00+00:00',
          obligationYear: 2026,
          obligations: notMetObligations,
          declarationText: {
            text: formatCertificateSubmitDeclarationApiText(declarationText)
          },
          submitterName: 'Typed Name'
        }
      ],
      organisation,
      currentOrganisation: { organisationNumber: '123456' },
      user: { firstName: 'Your', lastName: 'Name' },
      year: 2026
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
    const declarationText = buildCertificateSubmitDeclarationText(
      'en',
      'Petrie and Tew Limited'
    )

    const model = buildCertificateViewModel({
      declarations: [
        {
          id: 'declaration-1',
          created: '2026-03-15T09:30:00+00:00',
          obligationYear: 2026,
          obligationStatus: 'Met',
          obligations,
          declarationText: {
            text: formatCertificateSubmitDeclarationApiText(declarationText),
            language: 'cy'
          },
          submitterName: 'Typed Name'
        }
      ],
      organisation,
      currentOrganisation: { organisationNumber: '123456' },
      user: { firstName: 'Your', lastName: 'Name' },
      year: 2026
    })

    expect(model.submissionDate).toBe('15 March 2026')
    expect(model.glassTableRows.length).toBeGreaterThan(0)
    expect(model.glassRows[0].obligationToMeet).toBe('0')
  })
})
