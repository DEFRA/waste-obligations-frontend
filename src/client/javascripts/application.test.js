import { describe, expect, test, vi } from 'vitest'

const initAll = vi.fn()
const initCompliancePrint = vi.fn()
const initDownloadPdf = vi.fn()

vi.mock('govuk-frontend', () => ({
  initAll
}))

vi.mock('./compliance-print.js', () => ({
  initCompliancePrint
}))
vi.mock('./download-pdf.js', () => ({
  initDownloadPdf
}))

describe('application.js', () => {
  test('initialises GOV.UK Frontend components and compliance print', async () => {
    vi.resetModules()
    await import('./application.js')

    expect(initAll).toHaveBeenCalledOnce()
    expect(initCompliancePrint).toHaveBeenCalledOnce()
    expect(initDownloadPdf).toHaveBeenCalledOnce()
  })
})
