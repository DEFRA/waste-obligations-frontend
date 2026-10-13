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

  test('returns the API page unchanged when there is no year', async () => {
    const page = { prns: [standard2026], total: 1, page: 2, pageSize: 10 }
    const api = apiReturning(page)

    const result = await loadAwaitingAcceptancePrns(api, 'org-1', {
      search: 'ACME',
      material: 'Plastic',
      sort: 'issueDate',
      page: 2,
      pageSize: 10
    })

    expect(result).toBe(page)
    expect(api.getOrganisationPrns).toHaveBeenCalledWith('org-1', {
      search: 'ACME',
      status: 'AwaitingAcceptance',
      material: 'Plastic',
      sort: 'issueDate',
      page: 2,
      pageSize: 10
    })
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

  test('returns an empty first page when nothing matches', async () => {
    vi.useFakeTimers({ now: new Date('2026-06-15T12:00:00Z') })
    const api = apiReturning({ prns: [standard2026], total: 1 })

    const result = await loadAwaitingAcceptancePrns(api, 'org-1', {
      year: 2027
    })

    expect(result).toEqual({ prns: [], total: 0, page: 1, pageSize: 20 })
  })
})
