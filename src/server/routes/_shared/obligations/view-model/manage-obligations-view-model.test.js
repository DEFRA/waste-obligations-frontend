import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

import { config } from '#/config/config.js'
import { buildManageObligationsViewModel } from './manage-obligations-view-model.js'

function buildRequest({
  userType = 'producer',
  obligations = [],
  prnsTotal = 3,
  serviceRole
} = {}) {
  const isProducer = userType === 'producer'
  const params = isProducer
    ? { organisationId: 'org-uuid-1' }
    : { schemeId: 'scheme-uuid-1' }
  const user = serviceRole === undefined ? null : { serviceRole }

  return {
    params,
    query: {},
    headers: {},
    yar: {
      get: (key) => (key === 'user' ? user : null),
      set: () => {}
    },
    pre: {
      organisation: {
        id: isProducer ? 'org-uuid-1' : 'scheme-uuid-1',
        name: isProducer ? 'Best Foods Ltd' : 'Green Compliance Scheme',
        businessCountry: 'GB-ENG'
      },
      obligations,
      awaitingAcceptancePrns: {
        prns: [],
        total: prnsTotal,
        page: 1,
        pageSize: 20
      }
    }
  }
}

const plasticObligation = {
  material: 'Plastic',
  recyclingTarget: 0.75,
  tonnages: {
    material: 100,
    awaitingAcceptance: 10,
    accepted: 50,
    outstanding: 25,
    obligated: 75
  },
  status: 'NotMet'
}

describe('buildManageObligationsViewModel', () => {
  let previousShowPrnsFlag

  beforeEach(() => {
    previousShowPrnsFlag = config.get('features.showPrns')
    config.set('features.showPrns', true)
  })

  afterEach(() => {
    config.set('features.showPrns', previousShowPrnsFlag)
  })

  test('builds producer view model with correct fields', () => {
    const request = buildRequest({ obligations: [plasticObligation] })

    const result = buildManageObligationsViewModel({
      request,
      userType: 'producer',
      obligationYear: 2026
    })

    expect(result.locale).toBe('en')
    expect(result.obligationYear).toBe(2026)
    expect(result.deadlineYear).toBe(2027)
    expect(result.organisationName).toBe('Best Foods Ltd')
    expect(result.complianceSchemeName).toBeNull()
    expect(result.regulatorName).toBe('Environment Agency')
    expect(result.regulatorNameWithArticle).toBe('The Environment Agency')
    expect(result.awaitingAcceptanceCount).toBe(3)
    expect(result.isProducer).toBe(true)
    expect(result.obligationsTableRows.length).toBeGreaterThan(0)
    expect(result.glassTableRows.length).toBeGreaterThan(0)
    expect(result.acceptRejectPath).toBe('/producer/org-uuid-1/prns?year=2026')
    expect(result.submitCertificatePath).toBe(
      '/producer/org-uuid-1/compliance/certificate?year=2026'
    )
  })

  describe('content for a year with no obligations calculated', () => {
    const noDataMaterials = [
      'Aluminium',
      'Glass',
      'GlassRemelt',
      'Paper',
      'Plastic',
      'Steel',
      'Wood'
    ].map((material) => ({
      material,
      recyclingTarget: 0.5,
      tonnages: {
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: null,
        obligated: null
      },
      status: 'NoDataYet'
    }))
    const decemberWastePrn = {
      id: 'prn-1',
      status: 'AwaitingAcceptance',
      obligationYear: 2026,
      decemberWaste: true
    }

    function build({ obligations, prns = [], year = 2027 }) {
      const request = buildRequest({ obligations })
      request.pre.awaitingAcceptancePrns.prns = prns

      return buildManageObligationsViewModel({
        request,
        userType: 'producer',
        obligationYear: year
      })
    }

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('says the obligations are not calculated when every material has no data yet', () => {
      expect(build({ obligations: noDataMaterials }).notCalculated).toBe(true)
    })

    test('says nothing of the kind when any material has data', () => {
      const obligations = [...noDataMaterials, plasticObligation]

      expect(build({ obligations }).notCalculated).toBe(false)
    })

    test('names the year before the one being managed', () => {
      expect(build({ obligations: noDataMaterials }).previousYear).toBe(2026)
    })

    test('explains December waste for next year when a December waste note can go to either year', () => {
      const result = build({
        obligations: noDataMaterials,
        prns: [decemberWastePrn]
      })

      expect(result.showDecemberWasteDetails).toBe(true)
    })

    test('does not explain December waste when no awaiting note is December waste', () => {
      const result = build({
        obligations: noDataMaterials,
        prns: [{ ...decemberWastePrn, decemberWaste: false }]
      })

      expect(result.showDecemberWasteDetails).toBe(false)
    })

    test('does not explain December waste for the current year', () => {
      const result = build({
        obligations: noDataMaterials,
        prns: [decemberWastePrn],
        year: 2026
      })

      expect(result.showDecemberWasteDetails).toBe(false)
    })

    test('does not explain December waste outside December and January', () => {
      vi.setSystemTime(new Date('2027-02-10T12:00:00Z'))

      const result = build({
        obligations: noDataMaterials,
        prns: [{ ...decemberWastePrn, obligationYear: 2026 }],
        year: 2028
      })

      expect(result.showDecemberWasteDetails).toBe(false)
    })

    test('does not explain December waste when the note has only one year to go to', () => {
      const result = build({
        obligations: noDataMaterials,
        prns: [{ ...decemberWastePrn, obligationYear: 2024 }]
      })

      expect(result.showDecemberWasteDetails).toBe(false)
    })
  })

  test('builds CSO view model with compliance scheme name', () => {
    const request = buildRequest({ userType: 'cso' })

    const result = buildManageObligationsViewModel({
      request,
      userType: 'cso',
      obligationYear: 2026
    })

    expect(result.organisationName).toBeNull()
    expect(result.complianceSchemeName).toBe('Green Compliance Scheme')
    expect(result.isProducer).toBe(false)
    expect(result.acceptRejectPath).toBe('/cso/scheme-uuid-1/prns?year=2026')
    expect(result.submitCertificatePath).toBe(
      '/cso/scheme-uuid-1/compliance/statement?year=2026'
    )
  })

  test('defaults glass target to 76 when no GlassRemelt obligation', () => {
    const request = buildRequest()

    const result = buildManageObligationsViewModel({
      request,
      userType: 'producer',
      obligationYear: 2026
    })

    expect(result.glassTarget).toBe(76)
  })

  test('uses GlassRemelt recyclingTarget when available', () => {
    const request = buildRequest({
      obligations: [
        {
          material: 'GlassRemelt',
          recyclingTarget: 0.8,
          tonnages: {
            material: 0,
            awaitingAcceptance: 0,
            accepted: 0,
            outstanding: 0,
            obligated: 0
          },
          status: 'Met'
        }
      ]
    })

    const result = buildManageObligationsViewModel({
      request,
      userType: 'producer',
      obligationYear: 2026
    })

    expect(result.glassTarget).toBe(80)
  })

  test('defaults awaitingAcceptanceCount to 0 when pre is null', () => {
    const request = buildRequest()
    request.pre.awaitingAcceptancePrns = null

    const result = buildManageObligationsViewModel({
      request,
      userType: 'producer',
      obligationYear: 2026
    })

    expect(result.awaitingAcceptanceCount).toBe(0)
  })

  test('uses red status tags for NotMet on the manage obligations page', () => {
    const request = buildRequest({ obligations: [plasticObligation] })

    const result = buildManageObligationsViewModel({
      request,
      userType: 'producer',
      obligationYear: 2026
    })

    const statusCells = result.obligationsTableRows.map((row) => row[5].html)

    expect(statusCells.some((html) => html.includes('govuk-tag--red'))).toBe(
      true
    )
    expect(statusCells.some((html) => html.includes('govuk-tag--yellow'))).toBe(
      false
    )
  })

  test('links each material to its calculation page and bolds totals', () => {
    const request = buildRequest({ obligations: [plasticObligation] })

    const result = buildManageObligationsViewModel({
      request,
      userType: 'producer',
      obligationYear: 2026
    })

    const materialCells = result.obligationsTableRows.map((row) => row[0].html)
    const linkCell = materialCells.find((html) => html.includes('>Plastic<'))
    const totalsCell = materialCells.find((html) =>
      html.includes('<strong>Totals</strong>')
    )

    expect(linkCell).toContain(
      'href="/producer/org-uuid-1/obligations/plastic?year=2026"'
    )
    expect(totalsCell).toBeDefined()
    expect(
      result.obligationsTableRows.some((row) =>
        row.some((cell) => cell.classes === 'govuk-!-font-weight-bold')
      )
    ).toBe(true)
  })

  test('labels each material link for screen readers as the Azure page does', () => {
    const request = buildRequest({ obligations: [plasticObligation] })

    const result = buildManageObligationsViewModel({
      request,
      userType: 'producer',
      obligationYear: 2026
    })

    const cells = [
      ...result.obligationsTableRows,
      ...result.glassTableRows
    ].map((row) => row[0].html)
    const plastic = cells.find((html) => html.includes('>Plastic<'))
    const remaining = cells.find((html) => html.includes('>Remaining glass<'))

    expect(plastic).toContain('Plastic recycling obligation page')
    expect(plastic).toContain('aria-labelledby=')
    expect(remaining).toContain('Remaining glass recycling obligation page')
  })

  test('links glass rows to the glass page and leaves the totals row unlinked', () => {
    const request = buildRequest({ userType: 'cso' })

    const result = buildManageObligationsViewModel({
      request,
      userType: 'cso',
      obligationYear: 2026
    })

    const cells = [
      ...result.obligationsTableRows,
      ...result.glassTableRows
    ].map((row) => row[0].html)
    const glassLinks = cells.filter((html) =>
      html.includes('href="/cso/scheme-uuid-1/obligations/glass?year=2026"')
    )
    const totalsCells = cells.filter((html) => html.includes('Totals'))

    expect(glassLinks.length).toBe(3)
    expect(totalsCells.length).toBe(2)
    expect(totalsCells.every((html) => !html.includes('href'))).toBe(true)
  })

  test('puts the forwarded prefix on the material links', () => {
    const request = buildRequest({ obligations: [plasticObligation] })
    request.headers['x-forwarded-prefix'] = '/manage-recycling-obligations'

    const result = buildManageObligationsViewModel({
      request,
      userType: 'producer',
      obligationYear: 2026
    })

    const html = result.obligationsTableRows.map((row) => row[0].html).join('')

    expect(html).toContain(
      'href="/manage-recycling-obligations/producer/org-uuid-1/obligations/plastic?year=2026"'
    )
  })

  describe('materials with no data yet and low tonnage', () => {
    const noData = (material) => ({
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

    const lowTonnageMetGlass = {
      material: 'Glass',
      recyclingTarget: 0.5,
      tonnages: {
        material: 6,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: 0,
        obligated: 0
      },
      status: 'Met'
    }

    const lowTonnageMet = {
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

    const rowFor = (rows, name) =>
      rows.find((row) => (row[0].html ?? '').includes(name))

    const build = (obligations) =>
      buildManageObligationsViewModel({
        request: buildRequest({ obligations }),
        userType: 'producer',
        obligationYear: 2026
      })

    test('shows dashes in the obligation and outstanding columns for a No data yet material', () => {
      const { obligationsTableRows } = build([noData('Plastic')])
      const row = rowFor(obligationsTableRows, 'Plastic')

      expect(row[1].html).toContain('aria-hidden="true">-</span>')
      expect(row[4].html).toContain('aria-hidden="true">-</span>')
      expect(row[2].text).toBe('0')
      expect(row[3].text).toBe('0')
    })

    test('shows dashes on the glass and totals rows when every material has no data yet', () => {
      const { obligationsTableRows, glassTableRows } = build([
        noData('Plastic'),
        noData('GlassRemelt'),
        noData('Glass')
      ])

      for (const row of [
        rowFor(obligationsTableRows, 'Glass'),
        rowFor(obligationsTableRows, 'Totals'),
        rowFor(glassTableRows, 'Totals')
      ]) {
        expect(row[1].html).toContain('aria-hidden="true">-</span>')
        expect(row[4].html).toContain('aria-hidden="true">-</span>')
      }
    })

    test('totals still sum the materials that have data', () => {
      const { obligationsTableRows } = build([
        noData('Plastic'),
        plasticObligation
      ])
      const totals = rowFor(obligationsTableRows, 'Totals')

      expect(totals[1].text).toBe('75')
      expect(totals[4].text).toBe('25')
    })

    test('shows 0 in the obligation and outstanding columns for a Met material with under one tonne', () => {
      const { obligationsTableRows } = build([lowTonnageMet])
      const row = rowFor(obligationsTableRows, 'Wood')

      expect(row[1]).toMatchObject({ text: '0', format: 'numeric' })
      expect(row[4]).toMatchObject({ text: '0', format: 'numeric' })
    })

    test('shows 0, not a dash, for a Met material whose submitted POM rounds down to a zero obligation', () => {
      const { obligationsTableRows } = build([
        {
          ...lowTonnageMet,
          tonnages: { ...lowTonnageMet.tonnages, material: 6 }
        }
      ])
      const row = rowFor(obligationsTableRows, 'Wood')

      expect(row[1]).toMatchObject({ text: '0', format: 'numeric' })
      expect(row[4]).toMatchObject({ text: '0', format: 'numeric' })
      expect(row[1].html).toBeUndefined()
      expect(row[4].html).toBeUndefined()
    })

    test('shows 0 for a Met material with under one tonne for a CSO administrator', () => {
      const result = buildManageObligationsViewModel({
        request: buildRequest({
          userType: 'cso',
          obligations: [lowTonnageMet]
        }),
        userType: 'cso',
        obligationYear: 2026
      })
      const row = rowFor(result.obligationsTableRows, 'Wood')

      expect(row[1]).toMatchObject({ text: '0', format: 'numeric' })
      expect(row[4]).toMatchObject({ text: '0', format: 'numeric' })
    })

    test('shows 0 on the glass row that is Met with under one tonne when the other glass row is not met', () => {
      const { glassTableRows } = build([
        { ...plasticObligation, material: 'GlassRemelt' },
        lowTonnageMetGlass
      ])
      const metRow = glassTableRows.find((row) => row[5]?.html?.includes('Met'))

      expect(metRow[1]).toMatchObject({ text: '0', format: 'numeric' })
      expect(metRow[4]).toMatchObject({ text: '0', format: 'numeric' })
    })

    test('shows dashes for a CSO administrator too', () => {
      const result = buildManageObligationsViewModel({
        request: buildRequest({
          userType: 'cso',
          obligations: [noData('Plastic')]
        }),
        userType: 'cso',
        obligationYear: 2026
      })
      const row = rowFor(result.obligationsTableRows, 'Plastic')

      expect(row[1].html).toContain('aria-hidden="true">-</span>')
      expect(row[4].html).toContain('aria-hidden="true">-</span>')
    })

    test('announces the dash in Welsh when the locale is cy', () => {
      const request = buildRequest({ obligations: [noData('Plastic')] })
      request.yar.get = (key) => (key === 'locale' ? 'cy' : null)

      const result = buildManageObligationsViewModel({
        request,
        userType: 'producer',
        obligationYear: 2026
      })
      const row = result.obligationsTableRows.find((r) =>
        r[1].html?.includes('Ddim ar gael eto')
      )

      expect(row[1].html).toContain('Ddim ar gael eto')
      expect(row[4].html).toContain('Ddim ar gael eto')
    })

    test('sums the glass row when only one glass type has no data yet', () => {
      const { obligationsTableRows, glassTableRows } = build([
        noData('GlassRemelt'),
        {
          ...plasticObligation,
          material: 'Glass'
        }
      ])

      for (const row of [
        rowFor(obligationsTableRows, 'Glass'),
        rowFor(glassTableRows, 'Totals')
      ]) {
        expect(row[1]).toMatchObject({ text: '75', format: 'numeric' })
        expect(row[4]).toMatchObject({ text: '25', format: 'numeric' })
      }
    })
  })

  test('omits the accept/reject path when the feature flag is off', () => {
    config.set('features.showPrns', false)
    const request = buildRequest({ obligations: [plasticObligation] })

    const result = buildManageObligationsViewModel({
      request,
      userType: 'producer',
      obligationYear: 2026
    })

    expect(result.acceptRejectPath).toBeNull()
  })

  describe('alternative How to meet content', () => {
    const noDataYetObligation = {
      material: 'Plastic',
      recyclingTarget: null,
      tonnages: {
        material: 0,
        awaitingAcceptance: 0,
        accepted: 0,
        outstanding: 0,
        obligated: 0
      },
      status: 'NoDataYet'
    }

    const metObligation = { ...plasticObligation, status: 'Met' }

    function viewModelFor(request, obligationYear = 2027) {
      return buildManageObligationsViewModel({
        request,
        userType: 'producer',
        obligationYear
      })
    }

    test('shows alternative content when no obligations have been calculated', () => {
      const request = buildRequest({ obligations: [] })

      expect(viewModelFor(request).hasObligationData).toBe(false)
    })

    test('shows alternative content when every material is No data yet', () => {
      const request = buildRequest({
        obligations: [
          noDataYetObligation,
          { ...noDataYetObligation, material: 'Glass' }
        ]
      })

      expect(viewModelFor(request).hasObligationData).toBe(false)
    })

    test('treats missing obligations as not calculated', () => {
      const request = buildRequest()
      request.pre.obligations = undefined

      expect(viewModelFor(request).hasObligationData).toBe(false)
    })

    test('shows regular content when a material is Met', () => {
      const request = buildRequest({ obligations: [metObligation] })

      expect(viewModelFor(request).hasObligationData).toBe(true)
    })

    test('shows regular content when a material is Not met, even with others No data yet', () => {
      const request = buildRequest({
        obligations: [noDataYetObligation, plasticObligation]
      })

      expect(viewModelFor(request).hasObligationData).toBe(true)
    })

    test('gives the data year as one year before the obligation year', () => {
      const request = buildRequest({ obligations: [] })

      const result = viewModelFor(request, 2027)

      expect(result.obligationYear).toBe(2027)
      expect(result.dataYear).toBe(2026)
    })
  })

  describe('showButton and showLink by user role', () => {
    const build = (serviceRole) =>
      buildManageObligationsViewModel({
        request: buildRequest({
          obligations: [plasticObligation],
          serviceRole
        }),
        userType: 'producer',
        obligationYear: 2026
      })

    test.each([
      ['Approved Person', { showButton: true, showLink: true }],
      ['Delegated Person', { showButton: true, showLink: true }],
      ['Basic User', { showButton: false, showLink: true }]
    ])('a %s sees showButton %s and showLink %s', (serviceRole, expected) => {
      const result = build(serviceRole)

      expect(result.showButton).toBe(expected.showButton)
      expect(result.showLink).toBe(expected.showLink)
    })

    test('a user with an unrecognised role sees neither the button nor the link', () => {
      const result = build('Some Other Role')

      expect(result.showButton).toBe(false)
      expect(result.showLink).toBe(false)
    })

    test('a request with no user sees neither the button nor the link', () => {
      const result = build(undefined)

      expect(result.showButton).toBe(false)
      expect(result.showLink).toBe(false)
    })
  })
})
