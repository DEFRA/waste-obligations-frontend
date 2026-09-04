import { describe, test, expect } from 'vitest'

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
    expect(result.regulatorName).toBe('Environment Agency (England)')
    expect(result.awaitingAcceptanceCount).toBe(3)
    expect(result.isProducer).toBe(true)
    expect(result.obligationsTableRows.length).toBeGreaterThan(0)
    expect(result.glassTableRows.length).toBeGreaterThan(0)
    expect(result.acceptRejectPath).toBe('/producer/org-uuid-1/prns')
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
    expect(result.acceptRejectPath).toBe('/cso/scheme-uuid-1/prns')
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
})
