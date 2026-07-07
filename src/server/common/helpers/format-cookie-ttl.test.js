import { formatCookieTtl } from './format-cookie-ttl.js'

describe('formatCookieTtl', () => {
  test('formats whole hours', () => {
    expect(formatCookieTtl(3_600_000)).toBe('1 hour')
    expect(formatCookieTtl(14_400_000)).toBe('4 hours')
  })

  test('formats non-hour durations as minutes', () => {
    expect(formatCookieTtl(90_000)).toBe('2 minutes')
  })
})
