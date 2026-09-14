import { describe, expect, test } from 'vitest'

import { resolvePrnYear } from './resolve-prn-year.js'

describe('resolvePrnYear', () => {
  test('the PRN obligation year always wins over the query year', () => {
    expect(resolvePrnYear(2023, { obligationYear: 2024 })).toBe(2024)
  })

  test('uses the query year when the PRN has no obligation year', () => {
    expect(resolvePrnYear(2023, {})).toBe(2023)
  })

  test('returns undefined when neither year is available', () => {
    expect(resolvePrnYear(undefined, {})).toBeUndefined()
  })
})
