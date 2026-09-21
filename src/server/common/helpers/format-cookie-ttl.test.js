import { formatCookieTtl } from './format-cookie-ttl.js'
import { DEFAULT_COOKIE_POLICY_TTL_MS } from '#/config/cookie-config.js'

describe('formatCookieTtl', () => {
  test('formats whole hours in English', () => {
    expect(formatCookieTtl(3_600_000)).toBe('1 hour')
    expect(formatCookieTtl(14_400_000)).toBe('4 hours')
  })

  test('formats a 365-day ttl as one year', () => {
    expect(formatCookieTtl(DEFAULT_COOKIE_POLICY_TTL_MS)).toBe('1 year')
    expect(formatCookieTtl(DEFAULT_COOKIE_POLICY_TTL_MS, 'cy')).toBe(
      '1 flwyddyn'
    )
  })

  test('formats non-hour durations as minutes in English', () => {
    expect(formatCookieTtl(60_000)).toBe('1 minute')
    expect(formatCookieTtl(90_000)).toBe('2 minutes')
  })

  test('formats hours in Welsh from the cookies page translations', () => {
    expect(formatCookieTtl(3_600_000, 'cy')).toBe('1 awr')
    expect(formatCookieTtl(14_400_000, 'cy')).toBe('4 awr')
  })

  test('formats minutes in Welsh from the packaging cookies translations', () => {
    expect(formatCookieTtl(60_000, 'cy')).toBe('1 munud')
    expect(formatCookieTtl(900_000, 'cy')).toBe('15 munud')
  })
})
