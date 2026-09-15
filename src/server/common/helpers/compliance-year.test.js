import { describe, expect, test } from 'vitest'

import { getComplianceYear, getMaxQueryYear } from './compliance-year.js'

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

describe('getMaxQueryYear', () => {
  test.each([
    ['2026-01-15T12:00:00Z', 2026],
    ['2026-02-01T12:00:00Z', 2027],
    ['2026-12-31T12:00:00Z', 2027]
  ])('allows the next compliance year on %s', (iso, expected) => {
    expect(getMaxQueryYear(new Date(iso))).toBe(expected)
  })
})
