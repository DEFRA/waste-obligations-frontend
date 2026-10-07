import { describe, expect, test } from 'vitest'

import { buildPrnsSortFilter } from './prns-sort-filter.js'

const id = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

describe('buildPrnsSortFilter', () => {
  test('defaults to newest first and all materials', () => {
    const { sortOptions, filterOptions } = buildPrnsSortFilter({
      userType: 'producer',
      pathId: id
    })

    expect(sortOptions.filter((o) => o.selected).map((o) => o.value)).toEqual([
      'IssuedAtDescending'
    ])
    expect(sortOptions[0].text).toBe('Date issued (newest first)')
    expect(filterOptions.filter((o) => o.selected).map((o) => o.value)).toEqual(
      ['']
    )
    expect(filterOptions[0].text).toBe('All materials')
  })

  test('selects the requested sort and material', () => {
    const { sortOptions, filterOptions } = buildPrnsSortFilter({
      userType: 'producer',
      pathId: id,
      sort: 'TonnageAscending',
      material: 'GlassRemelt'
    })

    expect(sortOptions.find((o) => o.selected).value).toBe('TonnageAscending')
    expect(filterOptions.find((o) => o.selected).value).toBe('GlassRemelt')
    expect(filterOptions.find((o) => o.selected).text).toBe('Glass re-melt')
  })

  test('falls back to defaults for unknown values', () => {
    const { sortOptions, filterOptions } = buildPrnsSortFilter({
      userType: 'producer',
      pathId: id,
      sort: 'Nope',
      material: 'Nope'
    })

    expect(sortOptions.find((o) => o.selected).value).toBe('IssuedAtDescending')
    expect(filterOptions.find((o) => o.selected).value).toBe('')
  })

  test('builds producer form action and a clear link that keeps the year', () => {
    const result = buildPrnsSortFilter({
      userType: 'producer',
      pathId: id,
      year: 2026,
      sort: 'TonnageAscending'
    })

    expect(result.action).toBe(`/producer/${id}/prns`)
    expect(result.clearHref).toBe(`/producer/${id}/prns?year=2026`)
    expect(result.year).toBe(2026)
  })

  test('builds CSO paths and honours the forwarded prefix', () => {
    const result = buildPrnsSortFilter({
      userType: 'cso',
      pathId: id,
      request: {
        headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
      }
    })

    expect(result.action).toBe(`/manage-recycling-obligations/cso/${id}/prns`)
    expect(result.clearHref).toBe(
      `/manage-recycling-obligations/cso/${id}/prns`
    )
  })

  test('exposes the requested page size so the form can keep it', () => {
    expect(
      buildPrnsSortFilter({ userType: 'producer', pathId: id, pageSize: 5 })
        .pageSize
    ).toBe(5)
  })
})
