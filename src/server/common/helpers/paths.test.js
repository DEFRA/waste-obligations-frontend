import { describe, expect, test } from 'vitest'

import { withYearQuery } from './paths.js'

describe('withYearQuery', () => {
  test('appends the year as a query param', () => {
    expect(withYearQuery('/producer/org-1/prns', 2024)).toBe(
      '/producer/org-1/prns?year=2024'
    )
  })

  test('keeps a year of 0', () => {
    expect(withYearQuery('/producer/org-1/prns', 0)).toBe(
      '/producer/org-1/prns?year=0'
    )
  })

  test.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty string', '']
  ])('returns the path unchanged when the year is %s', (_label, year) => {
    expect(withYearQuery('/producer/org-1/prns', year)).toBe(
      '/producer/org-1/prns'
    )
  })
})
