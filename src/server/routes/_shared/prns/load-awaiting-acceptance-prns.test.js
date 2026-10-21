import { afterEach, describe, expect, test, vi } from 'vitest'

import { loadAwaitingAcceptancePrns } from './load-awaiting-acceptance-prns.js'

const standard2026 = { id: 'standard-2026', obligationYear: 2026 }
const december2026 = {
  id: 'december-2026',
  obligationYear: 2026,
  decemberWaste: true
}

function apiReturning(...pages) {
  const getOrganisationPrns = vi.fn()
  pages.forEach((response) =>
    getOrganisationPrns.mockResolvedValueOnce(response)
  )
  return { getOrganisationPrns }
}

describe('loadAwaitingAcceptancePrns', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('in December only December waste PRNs can be accepted into the future year', async () => {
    vi.useFakeTimers({ now: new Date('2026-12-15T12:00:00Z') })
    const api = apiReturning({
      prns: [standard2026, december2026],
      total: 2
    })

    const result = await loadAwaitingAcceptancePrns(api, 'org-1', {
      year: 2027
    })

    expect(result.prns).toEqual([december2026])
    expect(result.total).toBe(1)
  })

  test('both PRN kinds can be accepted into the current year', async () => {
    vi.useFakeTimers({ now: new Date('2026-12-15T12:00:00Z') })
    const api = apiReturning({
      prns: [standard2026, december2026],
      total: 2
    })

    const result = await loadAwaitingAcceptancePrns(api, 'org-1', {
      year: 2026
    })

    expect(result.prns).toEqual([standard2026, december2026])
  })

  test('loads every API page, passes filters through and pages the matches', async () => {
    vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00Z') })
    const first = Array.from({ length: 100 }, (_, i) => ({
      id: `a-${i}`,
      obligationYear: 2026
    }))
    const second = Array.from({ length: 5 }, (_, i) => ({
      id: `b-${i}`,
      obligationYear: 2026
    }))
    const api = apiReturning(
      { prns: first, total: 105 },
      { prns: second, total: 105 }
    )

    const result = await loadAwaitingAcceptancePrns(api, 'org-1', {
      year: 2026,
      search: 'x',
      page: 6,
      pageSize: 20
    })

    expect(api.getOrganisationPrns).toHaveBeenCalledTimes(2)
    expect(api.getOrganisationPrns).toHaveBeenNthCalledWith(2, 'org-1', {
      search: 'x',
      material: undefined,
      sort: undefined,
      status: 'AwaitingAcceptance',
      page: 2,
      pageSize: 100
    })
    expect(result.total).toBe(105)
    expect(result.page).toBe(6)
    expect(result.prns.map((prn) => prn.id)).toEqual([
      'b-0',
      'b-1',
      'b-2',
      'b-3',
      'b-4'
    ])
  })

  test('follows the page size the API reports when that is lower than requested', async () => {
    vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00Z') })
    const pageOf = (start, count) =>
      Array.from({ length: count }, (_, index) => ({
        id: `capped-${start + index}`,
        obligationYear: 2026
      }))
    const api = apiReturning(
      { prns: pageOf(0, 50), total: 120, pageSize: 50 },
      { prns: pageOf(50, 50), total: 120, pageSize: 50 },
      { prns: pageOf(100, 20), total: 120, pageSize: 50 }
    )

    const result = await loadAwaitingAcceptancePrns(api, 'org-1', {
      year: 2026
    })

    expect(api.getOrganisationPrns).toHaveBeenCalledTimes(3)
    expect(api.getOrganisationPrns).toHaveBeenNthCalledWith(2, 'org-1', {
      search: undefined,
      material: undefined,
      sort: undefined,
      status: 'AwaitingAcceptance',
      page: 2,
      pageSize: 50
    })
    expect(result.total).toBe(120)
  })

  test('keeps the first copy when a later page repeats a PRN', async () => {
    vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00Z') })
    const shared = { id: 'shared', obligationYear: 2026 }
    const api = apiReturning(
      {
        prns: [{ id: 'first', obligationYear: 2026 }, shared],
        total: 3,
        pageSize: 2
      },
      {
        prns: [shared, { id: 'last', obligationYear: 2026 }],
        total: 3,
        pageSize: 2
      }
    )

    const result = await loadAwaitingAcceptancePrns(api, 'org-1', {
      year: 2026,
      pageSize: 10
    })

    expect(result.prns.map((prn) => prn.id)).toEqual([
      'first',
      'shared',
      'last'
    ])
    expect(result.total).toBe(3)
  })

  test('keeps reading after a page that only repeats notes', async () => {
    vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00Z') })
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: `seen-${index}`,
      obligationYear: 2026
    }))
    const lastPage = [{ id: 'tail', obligationYear: 2026 }]
    const api = apiReturning(
      { prns: firstPage, total: 201, pageSize: 100 },
      { prns: firstPage, total: 100, pageSize: 20 },
      { prns: lastPage, total: 201, pageSize: 100 }
    )

    const result = await loadAwaitingAcceptancePrns(api, 'org-1', {
      year: 2026,
      pageSize: 200
    })

    expect(api.getOrganisationPrns).toHaveBeenCalledTimes(3)
    expect(api.getOrganisationPrns).toHaveBeenNthCalledWith(3, 'org-1', {
      search: undefined,
      material: undefined,
      sort: undefined,
      status: 'AwaitingAcceptance',
      page: 3,
      pageSize: 100
    })
    expect(result.prns.at(-1).id).toBe('tail')
    expect(result.total).toBe(101)
  })

  test('returns an empty first page when nothing matches', async () => {
    vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00Z') })
    const api = apiReturning({ prns: [standard2026], total: 1 })

    const result = await loadAwaitingAcceptancePrns(api, 'org-1', {
      year: 2027
    })

    expect(result).toEqual({ prns: [], total: 0, page: 1, pageSize: 20 })
  })
})
