import { describe, expect, test } from 'vitest'

import { buildPageList, buildPrnsPagination } from './prns-pagination.js'

const id = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

describe('buildPageList', () => {
  test.each([
    [1, 0, []],
    [1, 1, [1]],
    [1, 3, [1, 2, 3]],
    [2, 3, [1, 2, 3]],
    [4, 4, [1, 2, 3, 4]],
    [1, 10, [1, 2, 0, 10]],
    [5, 10, [1, 0, 4, 5, 6, 0, 10]],
    [6, 10, [1, 0, 5, 6, 7, 0, 10]],
    [10, 10, [1, 0, 9, 10]]
  ])('page %i of %i', (current, count, expected) => {
    expect(buildPageList(current, count)).toEqual(expected)
  })
})

describe('buildPrnsPagination', () => {
  const base = { userType: 'producer', pathId: id }

  test('returns null when there is a single page or no results', () => {
    expect(
      buildPrnsPagination({ ...base, page: 1, pageSize: 20, total: 20 })
    ).toBeNull()
    expect(
      buildPrnsPagination({ ...base, page: 1, pageSize: 20, total: 0 })
    ).toBeNull()
    expect(buildPrnsPagination({ ...base, page: 1, total: 50 })).toBeNull()
  })

  test('builds items with the current page marked and next only on page 1', () => {
    const result = buildPrnsPagination({
      ...base,
      page: 1,
      pageSize: 10,
      total: 25
    })

    expect(result.items).toEqual([
      { number: 1, href: `/producer/${id}/prns?page=1`, current: true },
      { number: 2, href: `/producer/${id}/prns?page=2`, current: false },
      { number: 3, href: `/producer/${id}/prns?page=3`, current: false }
    ])
    expect(result.previous).toBeUndefined()
    expect(result.next).toEqual({
      href: `/producer/${id}/prns?page=2`,
      text: 'Next'
    })
    expect(result.landmarkLabel).toBe('results')
  })

  test('adds previous on later pages and next only when more pages remain', () => {
    const result = buildPrnsPagination({
      ...base,
      page: 3,
      pageSize: 10,
      total: 25
    })

    expect(result.previous).toEqual({
      href: `/producer/${id}/prns?page=2`,
      text: 'Previous'
    })
    expect(result.next).toBeUndefined()
  })

  test('renders ellipses for long ranges', () => {
    const result = buildPrnsPagination({
      ...base,
      page: 1,
      pageSize: 10,
      total: 100
    })

    expect(result.items.map((i) => i.number ?? '…')).toEqual([1, 2, '…', 10])
    expect(result.items[2]).toEqual({ ellipsis: true })
  })

  test('keeps the current query and replaces page', () => {
    const result = buildPrnsPagination({
      ...base,
      page: 2,
      pageSize: 10,
      total: 30,
      request: {
        query: {
          year: 2026,
          sort: 'TonnageAscending',
          material: '',
          pageSize: 10,
          page: 2
        }
      }
    })

    expect(result.items[0].href).toBe(
      `/producer/${id}/prns?year=2026&sort=TonnageAscending&pageSize=10&page=1`
    )
  })

  test('uses CSO paths, the forwarded prefix and Welsh labels', () => {
    const result = buildPrnsPagination({
      userType: 'cso',
      pathId: id,
      locale: 'cy',
      page: 2,
      pageSize: 10,
      total: 30,
      request: {
        headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
      }
    })

    expect(result.items[0].href).toBe(
      `/manage-recycling-obligations/cso/${id}/prns?page=1`
    )
    expect(result.previous.text).toBe('Blaenorol')
    expect(result.next.text).toBe('Nesaf')
  })

  test('clamps an out-of-range page to the last page', () => {
    const result = buildPrnsPagination({
      ...base,
      page: 99,
      pageSize: 10,
      total: 25
    })

    expect(result.items.find((i) => i.current).number).toBe(3)
  })

  test.each([undefined, null, 'not-a-number', 1.5])(
    'defaults an invalid page (%s) to page 1',
    (page) => {
      const result = buildPrnsPagination({
        ...base,
        page,
        pageSize: 10,
        total: 25
      })

      expect(result.items.find((i) => i.current).number).toBe(1)
    }
  )
})
