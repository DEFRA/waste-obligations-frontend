import { describe, expect, test, vi } from 'vitest'

const initAll = vi.fn()

vi.mock('govuk-frontend', () => ({
  initAll
}))

describe('application.js', () => {
  test('initialises GOV.UK Frontend components', async () => {
    vi.resetModules()
    await import('./application.js')

    expect(initAll).toHaveBeenCalledOnce()
  })
})
