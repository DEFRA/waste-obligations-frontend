import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { config } from '#/config/config.js'

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

describe('buildStatementViewModel for materials with no data yet', () => {
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
    buildStatementViewModel({
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
      const { obligationsTableRows } = buildStatementViewModel({
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
