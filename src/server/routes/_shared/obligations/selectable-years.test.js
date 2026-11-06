import { describe, expect, test } from 'vitest'

import {
  CSOC_UNAVAILABLE_PAST_YEAR,
  getSelectableYears
} from './selectable-years.js'

describe('getSelectableYears', () => {
  test.each([
    ['1 November 2026', '2026-11-01T12:00:00Z', [2026, 2025]],
    ['30 November 2026', '2026-11-30T12:00:00Z', [2026, 2025]],
    ['1 December 2026', '2026-12-01T12:00:00Z', [2027, 2026, 2025]],
    ['31 December 2026', '2026-12-31T12:00:00Z', [2027, 2026, 2025]],
    ['15 January 2027', '2027-01-15T12:00:00Z', [2027, 2026, 2025]],
    ['1 February 2027', '2027-02-01T12:00:00Z', [2027, 2026, 2025]]
  ])('on %s offers %j, newest first', (_label, iso, expected) => {
    expect(getSelectableYears(new Date(iso))).toEqual(expected)
  })

  test('offers the next year in December and January only', () => {
    const years = (iso) => getSelectableYears(new Date(iso))

    expect(years('2026-11-30T23:00:00Z')).not.toContain(2027)
    expect(years('2026-12-01T00:00:00Z')).toContain(2027)
    expect(years('2027-01-31T12:00:00Z')).toContain(2027)
    expect(years('2027-01-31T12:00:00Z')).not.toContain(2028)
    expect(years('2027-02-01T12:00:00Z')).not.toContain(2028)
  })

  test('offers every year back to 2025 and none earlier', () => {
    const years = getSelectableYears(new Date('2028-06-01T12:00:00Z'))

    expect(years).toEqual([2028, 2027, 2026, 2025])
  })

  test('treats 2025 as the last year without calculated obligations', () => {
    expect(CSOC_UNAVAILABLE_PAST_YEAR).toBe(2025)
  })
})
