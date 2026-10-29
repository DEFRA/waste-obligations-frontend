import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { config } from '#/config/config.js'
import {
  buildOrganisationAddress,
  buildSubmitObligationTables,
  buildSubmitPageTitle
} from './view-model-base.js'

describe('buildSubmitObligationTables', () => {
  test('builds obligation and glass table rows', () => {
    const obligations = [
      {
        material: 'Plastic',
        recyclingTarget: 0.75,
        tonnages: {
          material: 100,
          awaitingAcceptance: 0,
          accepted: 100,
          outstanding: 0,
          obligated: 75
        },
        status: 'Met'
      },
      {
        material: 'Glass',
        recyclingTarget: 0.8,
        tonnages: {
          material: 50,
          awaitingAcceptance: 0,
          accepted: 40,
          outstanding: 10,
          obligated: 40
        },
        status: 'NotMet'
      }
    ]

    const tables = buildSubmitObligationTables(
      obligations,
      'en',
      'compliance.certificateSubmit'
    )

    expect(tables.obligationsTableRows.length).toBeGreaterThan(0)
    expect(tables.glassTableRows.length).toBeGreaterThan(0)
  })
})

describe('buildSubmitObligationTables for materials with no data yet', () => {
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
    buildSubmitObligationTables(
      obligations,
      'en',
      'compliance.certificateSubmit'
    )

  describe('with the Manage Obligations feature on', () => {
    beforeEach(() => {
      config.set('features.manageObligations', true)
    })

    test('shows dashes in the obligation and outstanding columns for a No data yet material', () => {
      const { obligationsTableRows } = build([noDataYet('Plastic')])
      const row = rowFor(obligationsTableRows, /plastic/i)

      expect(row[1].html).toContain(DASH)
      expect(row[4].html).toContain(DASH)
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
      expect(totals[4].text).toBe('0')
    })

    test('shows 0, not a dash, for a Met material with under one tonne', () => {
      const { obligationsTableRows } = build([metUnderOneTonne])
      const row = rowFor(obligationsTableRows, /wood/i)

      expect(row[1]).toMatchObject({ text: '0', format: 'numeric' })
      expect(row[4]).toMatchObject({ text: '0', format: 'numeric' })
    })
  })

  describe('with the Manage Obligations feature off', () => {
    beforeEach(() => {
      config.set('features.manageObligations', false)
    })

    test('keeps showing 0 on the glass and totals rows, as before', () => {
      const { obligationsTableRows } = build([
        noDataYet('Plastic'),
        noDataYet('GlassRemelt'),
        noDataYet('Glass')
      ])

      for (const row of [
        rowFor(obligationsTableRows, /^glass$/i),
        rowFor(obligationsTableRows, /total/i)
      ]) {
        expect(row[1]).toMatchObject({ text: '0' })
        expect(row[4]).toMatchObject({ text: '0' })
      }
    })
  })
})

describe('buildSubmitPageTitle', () => {
  test('returns translated page title without errors', () => {
    expect(
      buildSubmitPageTitle('en', 'compliance.certificateSubmit.pageTitle', null)
    ).toBe('Check and submit your certificate of compliance')
  })

  test('prefixes page title when form errors are present', () => {
    expect(
      buildSubmitPageTitle('en', 'compliance.certificateSubmit.pageTitle', {
        summary: [],
        fields: {}
      })
    ).toBe('Error: Check and submit your certificate of compliance')
  })
})

describe('buildOrganisationAddress', () => {
  test('formats organisation address from cached organisation', () => {
    expect(
      buildOrganisationAddress({
        address: {
          addressLine1: '1 The Street',
          town: 'Cardiff',
          postcode: 'CF10 1AA'
        }
      })
    ).toBe('1 The Street, Cardiff, CF10 1AA')
  })

  test('returns empty string when organisation is missing', () => {
    expect(buildOrganisationAddress(null)).toBe('')
  })
})
