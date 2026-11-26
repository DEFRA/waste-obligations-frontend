import { describe, expect, test, vi } from 'vitest'

const initAll = vi.fn()
const initCompliancePrint = vi.fn()
const initPrnPrint = vi.fn()
const initCookieBanner = vi.fn()
const initPrnsSortFilter = vi.fn()
const initPrnsSelection = vi.fn()

vi.mock('govuk-frontend', () => ({
  initAll
}))

vi.mock('./compliance-print.js', () => ({
  initCompliancePrint
}))

vi.mock('./prn-print.js', () => ({
  initPrnPrint
}))

vi.mock('./cookies.js', () => ({
  initCookieBanner
}))

vi.mock('./prns-sort-filter.js', () => ({
  initPrnsSortFilter
}))

vi.mock('./prns-selection.js', () => ({
  initPrnsSelection
}))

describe('application.js', () => {
  test('initialises GOV.UK Frontend components, print helpers, cookie banner, prns sort/filter and prns selection', async () => {
    vi.resetModules()
    await import('./application.js')

    expect(initAll).toHaveBeenCalledOnce()
    expect(initCompliancePrint).toHaveBeenCalledOnce()
    expect(initPrnPrint).toHaveBeenCalledOnce()
    expect(initCookieBanner).toHaveBeenCalledOnce()
    expect(initPrnsSortFilter).toHaveBeenCalledOnce()
    expect(initPrnsSelection).toHaveBeenCalledOnce()
  })
})
