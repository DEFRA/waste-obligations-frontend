import { describe, expect, test } from 'vitest'

import {
  canMultiSelectPrn,
  resolveAvailableAcceptanceYears
} from './available-acceptance-years.js'

describe('resolveAvailableAcceptanceYears', () => {
  test('returns empty when obligation year is missing', () => {
    expect(resolveAvailableAcceptanceYears({})).toEqual([])
  })

  test('returns the PRN year when it matches the current compliance year', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2026, decemberWaste: false },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toEqual([2026])
  })

  test('returns empty for an expired non-December PRN', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2025, decemberWaste: false },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toEqual([])
  })

  test('offers both years for December waste inside the choice window', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2026, decemberWaste: true },
        { now: new Date('2026-12-15T12:00:00Z') }
      )
    ).toEqual([2026, 2027])
  })

  test('offers only the next year for December waste after the choice window', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2026, decemberWaste: true },
        { now: new Date('2027-03-01T12:00:00Z') }
      )
    ).toEqual([2027])
  })

  test('2025 December waste never offers a year choice', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2025, decemberWaste: true },
        { now: new Date('2025-12-15T12:00:00Z') }
      )
    ).toEqual([2025])
  })

  test('returns empty for a future obligation year', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2027, decemberWaste: false },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toEqual([])
  })

  test('returns empty for a non-integer obligation year', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2026.5, decemberWaste: false },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toEqual([])
  })

  test('2025 December waste uses the current compliance year in 2026', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2025, decemberWaste: true },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toEqual([2026])
  })

  test('returns empty for expired 2025 December waste', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2025, decemberWaste: true },
        { now: new Date('2027-02-01T12:00:00Z') }
      )
    ).toEqual([])
  })

  test('returns empty for expired 2026 December waste after the next compliance year', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2026, decemberWaste: true },
        { now: new Date('2028-02-01T12:00:00Z') }
      )
    ).toEqual([])
  })

  test('keeps a standard PRN selectable through January of the following calendar year', () => {
    expect(
      resolveAvailableAcceptanceYears(
        { obligationYear: 2025, decemberWaste: false },
        { now: new Date('2026-01-15T12:00:00Z') }
      )
    ).toEqual([2025])
  })
})

describe('canMultiSelectPrn', () => {
  test('is true for a standard PRN in the current compliance year', () => {
    expect(
      canMultiSelectPrn(
        { obligationYear: 2026, decemberWaste: false },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toBe(true)
  })

  test('is false for December waste with a multi-year choice', () => {
    expect(
      canMultiSelectPrn(
        { obligationYear: 2026, decemberWaste: true },
        { now: new Date('2026-12-15T12:00:00Z') }
      )
    ).toBe(false)
  })

  test('is true for December waste with a single available year', () => {
    expect(
      canMultiSelectPrn(
        { obligationYear: 2026, decemberWaste: true },
        { now: new Date('2027-03-01T12:00:00Z') }
      )
    ).toBe(true)
  })

  test('is true for 2025 December waste, which never offers a year choice', () => {
    expect(
      canMultiSelectPrn(
        { obligationYear: 2025, decemberWaste: true },
        { now: new Date('2025-12-15T12:00:00Z') }
      )
    ).toBe(true)
  })

  test('is false for an expired standard PRN', () => {
    expect(
      canMultiSelectPrn(
        { obligationYear: 2025, decemberWaste: false },
        { now: new Date('2026-06-01T12:00:00Z') }
      )
    ).toBe(false)
  })
})
