import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

import { config } from '#/config/config.js'
import { buildManageObligationsViewModel } from './manage-obligations-view-model.js'

function buildRequest({
  userType = 'producer',
  obligations = [],
  prnsTotal = 3
} = {}) {
  const isProducer = userType === 'producer'
  const params = isProducer
    ? { organisationId: 'org-uuid-1' }
    : { schemeId: 'scheme-uuid-1' }

  return {
    params,
    query: {},
    headers: {},
    yar: {
      get: () => null,
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
    expect(result.awaitingAcceptanceCount).toBe(3)
    expect(result.isProducer).toBe(true)
    expect(result.obligationsTableRows.length).toBeGreaterThan(0)
    expect(result.glassTableRows.length).toBeGreaterThan(0)
    expect(result.acceptRejectPath).toBe('/producer/org-uuid-1/prns?year=2026')
    expect(result.submitCertificatePath).toBe(
      '/producer/org-uuid-1/compliance/certificate?year=2026'
    )
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

  test('renders material names as placeholder links and bolds totals', () => {
    const request = buildRequest({ obligations: [plasticObligation] })

    const result = buildManageObligationsViewModel({
      request,
      userType: 'producer',
      obligationYear: 2026
    })

    const materialCells = result.obligationsTableRows.map((row) => row[0].html)
    const linkCell = materialCells.find((html) => html.includes('govuk-link'))
    const totalsCell = materialCells.find((html) =>
      html.includes('<strong>Totals</strong>')
    )

    expect(linkCell).toContain('href="#"')
    expect(totalsCell).toBeDefined()
    expect(
      result.obligationsTableRows.some((row) =>
        row.some((cell) => cell.classes === 'govuk-!-font-weight-bold')
      )
    ).toBe(true)
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

  describe('submitted declaration', () => {
    function buildRequestWithDeclarations(userType, declarations) {
      const request = buildRequest({ userType })
      request.pre.declarations = declarations
      return request
    }

    test('is null when no declaration exists for the year', () => {
      const request = buildRequestWithDeclarations('producer', [])

      const result = buildManageObligationsViewModel({
        request,
        userType: 'producer',
        obligationYear: 2026
      })

      expect(result.submittedDeclaration).toBeNull()
    })

    test('links a producer to the submitted certificate for the year', () => {
      const request = buildRequestWithDeclarations('producer', [
        { id: 'certificate-1', obligationYear: 2026, status: 'Submitted' }
      ])

      const result = buildManageObligationsViewModel({
        request,
        userType: 'producer',
        obligationYear: 2026
      })

      expect(result.submittedDeclaration.href).toContain(
        '/compliance/certificate/certificate-1'
      )
      expect(result.submittedDeclaration.buttonLabel).toBe(
        'View your certificate'
      )
    })

    test('links a CSO to the submitted statement for the year', () => {
      const request = buildRequestWithDeclarations('cso', [
        { id: 'statement-1', obligationYear: 2026, status: 'Accepted' }
      ])

      const result = buildManageObligationsViewModel({
        request,
        userType: 'cso',
        obligationYear: 2026
      })

      expect(result.submittedDeclaration.href).toContain(
        '/compliance/statement/statement-1'
      )
      expect(result.submittedDeclaration.buttonLabel).toBe(
        'View your statement'
      )
    })

    test('ignores cancelled declarations and declarations for other years', () => {
      const request = buildRequestWithDeclarations('producer', [
        { id: 'cancelled-1', obligationYear: 2026, status: 'Cancelled' },
        { id: 'other-year-1', obligationYear: 2025, status: 'Submitted' }
      ])

      const result = buildManageObligationsViewModel({
        request,
        userType: 'producer',
        obligationYear: 2026
      })

      expect(result.submittedDeclaration).toBeNull()
    })
  })

  describe('missed deadline', () => {
    // The deadline is 31 January 2027 for the 2026 obligation year.
    const obligationYear = 2026

    function buildMissedRequest(userType, declarations = []) {
      const request = buildRequest({ userType })
      request.pre.declarations = declarations
      return request
    }

    function viewModelAt(isoDate, userType, declarations) {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(isoDate))

      return buildManageObligationsViewModel({
        request: buildMissedRequest(userType, declarations),
        userType,
        obligationYear
      })
    }

    afterEach(() => {
      vi.useRealTimers()
    })

    test('is null on the last day of January, when the deadline is still open', () => {
      const result = viewModelAt('2027-01-31T23:30:00Z', 'producer')

      expect(result.missedDeadline).toBeNull()
    })

    test('describes the missed certificate for a producer from 1 February', () => {
      const result = viewModelAt('2027-02-01T12:00:00Z', 'producer')

      expect(result.missedDeadline.heading).toBe(
        'You missed the certificate of compliance deadline'
      )
      expect(result.missedDeadline.paragraphPrefix).toContain(
        'submission deadline of 31 January 2027'
      )
      expect(result.missedDeadline.paragraphPrefix).toContain(
        'no longer submit your 2026 certificate of compliance'
      )
      expect(result.missedDeadline.paragraphSuffix).toBe(
        'The Environment Agency will contact you to discuss what happens next.'
      )
    })

    test('describes the missed statement for a CSO from 1 February', () => {
      const result = viewModelAt('2027-02-01T12:00:00Z', 'cso')

      expect(result.missedDeadline.heading).toBe(
        'You missed the statement of compliance deadline'
      )
    })

    test('is null once the year has been submitted, even after the deadline', () => {
      const result = viewModelAt('2027-03-10T12:00:00Z', 'producer', [
        { id: 'certificate-1', obligationYear: 2026, status: 'Submitted' }
      ])

      expect(result.submittedDeclaration).not.toBeNull()
      expect(result.missedDeadline).toBeNull()
    })
  })

  describe('cancelled submission', () => {
    const obligationYear = 2026
    const cancelled = [
      { id: 'cancelled-1', obligationYear: 2026, status: 'Cancelled' }
    ]

    function viewModelAt(isoDate, userType, declarations) {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(isoDate))

      const request = buildRequest({ userType })
      request.pre.declarations = declarations

      return buildManageObligationsViewModel({
        request,
        userType,
        obligationYear
      })
    }

    afterEach(() => {
      vi.useRealTimers()
    })

    test('describes the cancelled certificate for a producer while the deadline is open', () => {
      const result = viewModelAt('2026-12-01T12:00:00Z', 'producer', cancelled)

      expect(result.cancelledSubmission.heading).toBe(
        'Resubmit your certificate of compliance'
      )
      expect(result.cancelledSubmission.paragraph).toBe(
        'The Environment Agency cancelled your 2026 certificate of compliance. An approved or delegated person must resubmit your certificate on or before 31 January 2027.'
      )
      expect(result.cancelledSubmission.buttonLabel).toBe(
        'Resubmit your certificate'
      )
    })

    test('describes the cancelled statement for a CSO while the deadline is open', () => {
      const result = viewModelAt('2026-12-01T12:00:00Z', 'cso', cancelled)

      expect(result.cancelledSubmission.heading).toBe(
        'Resubmit your statement of compliance'
      )
      expect(result.cancelledSubmission.buttonLabel).toBe(
        'Resubmit your statement'
      )
    })

    test('describes the cancelled certificate, with no resubmit option, once the deadline has passed', () => {
      const result = viewModelAt('2027-02-01T12:00:00Z', 'producer', cancelled)

      expect(result.cancelledSubmission).toBeNull()
      expect(result.cancelledMissedDeadline.heading).toBe(
        'You missed the certificate of compliance deadline'
      )
      expect(result.cancelledMissedDeadline.paragraphPrefix).toBe(
        'The Environment Agency cancelled your 2026 certificate of compliance.'
      )
      expect(result.cancelledMissedDeadline.paragraphSuffix).toBe(
        'As the deadline of 31 January 2027 has now passed, you can no longer resubmit your certificate. The Environment Agency will contact you to discuss what happens next.'
      )
      expect(result.missedDeadline).toBeNull()
    })

    test('describes the cancelled statement for a CSO once the deadline has passed', () => {
      const result = viewModelAt('2027-02-01T12:00:00Z', 'cso', cancelled)

      expect(result.cancelledMissedDeadline.heading).toBe(
        'You missed the statement of compliance deadline'
      )
      expect(result.cancelledMissedDeadline.paragraphSuffix).toContain(
        'you can no longer resubmit your statement'
      )
    })

    test('is null when the year has also been submitted', () => {
      const result = viewModelAt('2026-12-01T12:00:00Z', 'producer', [
        ...cancelled,
        { id: 'submitted-1', obligationYear: 2026, status: 'Submitted' }
      ])

      expect(result.cancelledSubmission).toBeNull()
      expect(result.submittedDeclaration).not.toBeNull()
    })

    test('is null when nothing has been cancelled for the year', () => {
      const result = viewModelAt('2026-12-01T12:00:00Z', 'producer', [])

      expect(result.cancelledSubmission).toBeNull()
    })
  })
})
