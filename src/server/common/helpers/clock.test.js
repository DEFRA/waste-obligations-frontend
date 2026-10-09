import { resolveNow } from './clock.js'

describe('resolveNow', () => {
  const { env } = process

  afterEach(() => {
    process.env = { ...env }
  })

  test('returns the real current time when DECEMBER_WASTE_FLASH_DATE is unset', () => {
    delete process.env.DECEMBER_WASTE_FLASH_DATE
    const before = Date.now()

    const result = resolveNow()

    expect(result.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.getTime()).toBeLessThanOrEqual(Date.now())
  })

  test('returns the configured date when DECEMBER_WASTE_FLASH_DATE is set', () => {
    process.env.DECEMBER_WASTE_FLASH_DATE = '2026-12-15T12:00:00Z'

    expect(resolveNow()).toEqual(new Date('2026-12-15T12:00:00Z'))
  })

  test('throws when DECEMBER_WASTE_FLASH_DATE is not a valid date', () => {
    process.env.DECEMBER_WASTE_FLASH_DATE = 'not-a-date'

    expect(() => resolveNow()).toThrow(
      'DECEMBER_WASTE_FLASH_DATE must be a valid date, got "not-a-date"'
    )
  })
})
