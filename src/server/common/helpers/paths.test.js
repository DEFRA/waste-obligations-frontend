import { describe, expect, test } from 'vitest'

import { withQuery, withYearQuery } from './paths.js'

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

describe('withQuery', () => {
  test('appends every defined, non-empty entry as a query param', () => {
    expect(
      withQuery('/producer/org-1/prns', {
        year: 2026,
        sort: 'TonnageDescending',
        material: 'Plastic',
        page: 2,
        pageSize: 20
      })
    ).toBe(
      '/producer/org-1/prns?year=2026&sort=TonnageDescending&material=Plastic&page=2&pageSize=20'
    )
  })

  test('omits undefined, null and empty-string entries', () => {
    expect(
      withQuery('/producer/org-1/prns', {
        year: 2026,
        sort: undefined,
        material: null,
        page: ''
      })
    ).toBe('/producer/org-1/prns?year=2026')
  })

  test('returns the path unchanged when the query is empty or omitted', () => {
    expect(withQuery('/producer/org-1/prns', {})).toBe('/producer/org-1/prns')
    expect(withQuery('/producer/org-1/prns')).toBe('/producer/org-1/prns')
  })
})
