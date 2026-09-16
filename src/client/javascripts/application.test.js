import { describe, expect, test, vi } from 'vitest'

const initAll = vi.fn()
const initCompliancePrint = vi.fn()
const initPrnPrint = vi.fn()

vi.mock('govuk-frontend', () => ({
  initAll
}))

vi.mock('./compliance-print.js', () => ({
  initCompliancePrint
}))

vi.mock('./prn-print.js', () => ({
  initPrnPrint
}))

describe('application.js', () => {
  test('initialises GOV.UK Frontend components, compliance and prn print', async () => {
    vi.resetModules()
    await import('./application.js')

    expect(initAll).toHaveBeenCalledOnce()
    expect(initCompliancePrint).toHaveBeenCalledOnce()
    expect(initPrnPrint).toHaveBeenCalledOnce()
  })
})
