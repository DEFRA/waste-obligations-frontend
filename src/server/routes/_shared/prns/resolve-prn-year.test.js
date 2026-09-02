import { describe, expect, test } from 'vitest'

import { resolvePrnYear } from './resolve-prn-year.js'

const currentYear = new Date().getFullYear()

describe('resolvePrnYear', () => {
  test('the PRN obligation year always wins over the query year', () => {
    expect(resolvePrnYear(2023, { obligationYear: 2024 })).toBe(2024)
  })

  test('uses the PRN obligation year when the query year is missing', () => {
    expect(resolvePrnYear(undefined, { obligationYear: 2024 })).toBe(2024)
  })

  test('uses the query year when the PRN has no obligation year', () => {
    expect(resolvePrnYear(2023, {})).toBe(2023)
  })

  test('falls back to the current year when neither is available', () => {
    expect(resolvePrnYear(undefined, undefined)).toBe(currentYear)
    expect(resolvePrnYear(undefined, {})).toBe(currentYear)
  })
})
