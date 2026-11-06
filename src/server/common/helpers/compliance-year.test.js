import { describe, expect, test, vi } from 'vitest'

import {
  getComplianceYear,
  getMaxQueryYear,
  isFutureYearWindow,
  isSubmissionDeadlinePassed,
  getUkYearMonth
} from './compliance-year.js'

// Compared as numbers, so ICU's exact month formatting (e.g. "07") doesn't matter.
describe('getUkYearMonth', () => {
  test.each([
    // UK summer time: 23:30 UTC on 30 June is already July in London
    ['2026-06-30T23:30:00Z', { year: 2026, month: 7 }],
    // December and January are GMT, so UTC and UK agree at the year boundary
    ['2026-12-31T23:59:59Z', { year: 2026, month: 12 }],
    ['2027-01-01T00:00:00Z', { year: 2027, month: 1 }],
    ['2027-01-31T23:59:59Z', { year: 2027, month: 1 }],
    ['2027-02-01T00:00:00Z', { year: 2027, month: 2 }]
  ])('reads %s as UK year/month %o', (iso, expected) => {
    expect(getUkYearMonth(new Date(iso))).toEqual(expected)
  })

  // UK clocks go forward on 29 Mar 2026 and back on 25 Oct 2026. 23:30 UTC on
  // the last day of a month is the next month in London only under BST.
  test.each([
    ['2026-03-31T23:30:00Z', { year: 2026, month: 4 }],
    ['2026-09-30T23:30:00Z', { year: 2026, month: 10 }],
    ['2026-10-31T23:30:00Z', { year: 2026, month: 10 }]
  ])('applies UK daylight saving at month end: %s -> %o', (iso, expected) => {
    expect(getUkYearMonth(new Date(iso))).toEqual(expected)
  })

  test('returns the year and month as numbers', () => {
    const { year, month } = getUkYearMonth(new Date('2026-07-01T12:00:00Z'))

    expect(typeof year).toBe('number')
    expect(typeof month).toBe('number')
  })

  test('uses the current date when no date is given', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))

    try {
      expect(getUkYearMonth()).toEqual({ year: 2026, month: 12 })
    } finally {
      vi.useRealTimers()
    }
  })

  test('throws a RangeError for an invalid date', () => {
    expect(() => getUkYearMonth(new Date('not-a-date'))).toThrow(RangeError)
  })
})

describe('getComplianceYear', () => {
  test.each([
    ['2024-01-01T12:00:00Z', 2023],
    ['2024-02-01T12:00:00Z', 2024],
    ['2024-12-31T12:00:00Z', 2024],
    ['2025-01-01T12:00:00Z', 2024],
    ['2025-02-01T12:00:00Z', 2025],
    ['2026-01-15T12:00:00Z', 2025],
    ['2026-02-01T12:00:00Z', 2026]
  ])('maps %s to compliance year %i', (iso, expected) => {
    expect(getComplianceYear(new Date(iso))).toBe(expected)
  })
})

describe('isFutureYearWindow', () => {
  test.each([
    ['2026-11-30T23:00:00Z', false],
    ['2026-12-01T00:00:00Z', true],
    ['2026-12-31T12:00:00Z', true],
    ['2027-01-31T12:00:00Z', true],
    ['2027-02-01T00:00:00Z', false],
    ['2027-06-15T12:00:00Z', false]
  ])('is %s in the December and January window: %s', (iso, expected) => {
    expect(isFutureYearWindow(new Date(iso))).toBe(expected)
  })
})

describe('getMaxQueryYear', () => {
  test.each([
    ['2026-01-15T12:00:00Z', 2026],
    ['2026-02-01T12:00:00Z', 2026],
    ['2026-11-30T12:00:00Z', 2026],
    ['2026-12-01T12:00:00Z', 2027],
    ['2026-12-31T12:00:00Z', 2027]
  ])('allows up to %s: %i', (iso, expected) => {
    expect(getMaxQueryYear(new Date(iso))).toBe(expected)
  })
})

describe('isSubmissionDeadlinePassed', () => {
  test.each([
    [2026, '2027-01-31T23:30:00Z', false],
    [2026, '2027-02-01T00:00:00Z', true],
    [2026, '2027-06-15T12:00:00Z', true],
    [2026, '2026-12-15T12:00:00Z', false],
    [2027, '2027-02-10T12:00:00Z', false],
    [2025, '2026-02-01T12:00:00Z', true]
  ])(
    'for obligation year %i the deadline at %s has passed: %s',
    (year, iso, expected) => {
      expect(isSubmissionDeadlinePassed(year, new Date(iso))).toBe(expected)
    }
  )
})
