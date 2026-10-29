import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { config } from '#/config/config.js'

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
  return {
    id: '6830b9d4c7e21f5a8d3e64b2',
    created: '2026-04-02T14:00:00+00:00',
    updated: '2026-04-02T14:00:00+00:00',
    obligationYear: 2026,
    obligationStatus: 'Met',
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
      declaration: buildDeclaration()
    })

    expect(model).toMatchObject({
      year: 2026,
      organisationName: 'Petrie and Tew Limited',
      organisationNumber: '123456',
      organisationAddress: 'Pixash Lane, Keynsham, Bristol, BS31 1TP',
      nameOnAccount: 'Account Holder Name',
      submissionDate: '2 April 2026',
      regulatorName: 'Environment Agency',
      obligationStatus: 'Met',
      submitterName: 'Typed Name'
    })
    expect(model.obligationsRows.at(-1).materialKey).toBe(
      'compliance.components.obligationsTable.table.totalsRow'
    )
  })

  test('returns null when declaration is missing', () => {
    expect(buildCertificateViewModel({ declaration: null })).toBeNull()
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
      })
    })

    expect(model.obligationStatus).toBe('NotMet')

    const woodRow = model.obligationsRows.find((row) => row.material === 'Wood')
    expect(woodRow.tag).toEqual({
      variant: 'yellow',
      i18nKey:
        'compliance.certificateView.components.obligationsTable.obligationStatus.notMet'
    })
    expect(
      model.obligationsTableRows.some((row) => row[5].html.includes('Not met'))
    ).toBe(true)
  })

  test('formats submission date from created when updated is missing', () => {
    const model = buildCertificateViewModel({
      declaration: buildDeclaration({
        created: '2026-03-15T09:30:00+00:00',
        updated: undefined
      }),
      locale: 'cy'
    })

    expect(model.submissionDate).toBe('15 March 2026')
    expect(model.glassTableRows.length).toBeGreaterThan(0)
    expect(model.glassRows[0].obligationToMeet).toBe('0')
  })

  test('falls back to empty organisation name and number when missing', () => {
    const model = buildCertificateViewModel({
      declaration: buildDeclaration({
        organisation: {
          id: organisationId,
          name: undefined,
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

    expect(model.organisationName).toBe('')
    expect(model.organisationNumber).toBe('')
  })
})

describe('buildCertificateViewModel for materials with no data yet', () => {
  const noDataYet = (material) => ({
    material,
    recyclingTarget: 0.5,
    tonnages: {
      material: 0,
      awaitingAcceptance: 0,
      accepted: 0,
      outstanding: 0,
      obligated: 0
    },
    status: 'NoDataYet'
  })

  const plasticWithData = {
    material: 'Plastic',
    recyclingTarget: 0.75,
    tonnages: {
      material: 100,
      awaitingAcceptance: 0,
      accepted: 75,
      outstanding: 0,
      obligated: 75
    },
    status: 'Met'
  }

  const metUnderOneTonne = {
    material: 'Wood',
    recyclingTarget: 0.5,
    tonnages: {
      material: 0,
      awaitingAcceptance: 0,
      accepted: 0,
      outstanding: 0,
      obligated: 0
    },
    status: 'Met'
  }

  const DASH = 'aria-hidden="true">-</span>'
  const rowFor = (rows, name) => rows.find((row) => name.test(row[0].text))

  let previousFlag

  beforeEach(() => {
    previousFlag = config.get('features.manageObligations')
  })

  afterEach(() => {
    config.set('features.manageObligations', previousFlag)
  })

  const build = (obligations) =>
    buildCertificateViewModel({
      declaration: buildDeclaration({
        obligations,
        obligationStatus: 'NoDataYet'
      })
    })

  describe('with the Manage Obligations feature on', () => {
    beforeEach(() => {
      config.set('features.manageObligations', true)
    })

    test('shows dashes in the obligation and outstanding columns for a No data yet material', () => {
      const { obligationsTableRows } = build([noDataYet('Plastic')])
      const row = rowFor(obligationsTableRows, /plastic/i)

      expect(row[1].html).toContain(DASH)
      expect(row[4].html).toContain(DASH)
      expect(row[2].text).toBe('0')
      expect(row[3].text).toBe('0')
    })

    test('shows dashes on the glass and totals rows when every material has no data yet', () => {
      const { obligationsTableRows, glassTableRows } = build([
        noDataYet('Plastic'),
        noDataYet('GlassRemelt'),
        noDataYet('Glass')
      ])

      for (const row of [
        rowFor(obligationsTableRows, /^glass$/i),
        rowFor(obligationsTableRows, /total/i),
        rowFor(glassTableRows, /total/i)
      ]) {
        expect(row[1].html).toContain(DASH)
        expect(row[4].html).toContain(DASH)
      }
    })

    test('totals still sum the materials that have data', () => {
      const { obligationsTableRows } = build([
        noDataYet('Wood'),
        plasticWithData
      ])
      const totals = rowFor(obligationsTableRows, /total/i)

      expect(totals[1].text).toBe('75')
    })

    test('shows 0, not a dash, for a Met material with under one tonne', () => {
      const { obligationsTableRows } = build([metUnderOneTonne])
      const row = rowFor(obligationsTableRows, /wood/i)

      expect(row[1]).toMatchObject({ text: '0', format: 'numeric' })
      expect(row[4]).toMatchObject({ text: '0', format: 'numeric' })
    })

    test('announces the dash in Welsh when the locale is cy', () => {
      const { obligationsTableRows } = buildCertificateViewModel({
        declaration: buildDeclaration({
          obligations: [noDataYet('Plastic')],
          obligationStatus: 'NoDataYet'
        }),
        locale: 'cy'
      })
      const row = obligationsTableRows.find((r) =>
        r[1].html?.includes('Ddim ar gael eto')
      )

      expect(row[1].html).toContain('Ddim ar gael eto')
      expect(row[4].html).toContain('Ddim ar gael eto')
    })
  })

  describe('with the Manage Obligations feature off', () => {
    beforeEach(() => {
      config.set('features.manageObligations', false)
    })

    test('keeps showing 0 for a No data yet material, as before', () => {
      const { obligationsTableRows } = build([noDataYet('Plastic')])
      const row = rowFor(obligationsTableRows, /plastic/i)

      expect(row[1]).toMatchObject({ text: '0' })
      expect(row[4]).toMatchObject({ text: '0' })
    })
  })
})
