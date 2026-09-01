import { describe, expect, test, vi } from 'vitest'

const initAll = vi.fn()
const initCompliancePrint = vi.fn()

vi.mock('govuk-frontend', () => ({
  initAll
}))

vi.mock('./compliance-print.js', () => ({
  initCompliancePrint
}))

describe('application.js', () => {
  test('initialises GOV.UK Frontend components and compliance print', async () => {
    vi.resetModules()
    await import('./application.js')

    expect(initAll).toHaveBeenCalledOnce()
    expect(initCompliancePrint).toHaveBeenCalledOnce()
  })
})
