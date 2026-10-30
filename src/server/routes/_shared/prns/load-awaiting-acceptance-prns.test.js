import { describe, expect, test, vi } from 'vitest'

import {
  countAcceptablePrnsForYear,
  loadAwaitingAcceptancePrns
} from './load-awaiting-acceptance-prns.js'

const standard2026 = { id: 'standard-2026', obligationYear: 2026 }
const december2026 = {
  id: 'december-2026',
  obligationYear: 2026,
  decemberWaste: true
}

function apiReturning(response) {
  return { getOrganisationPrns: vi.fn().mockResolvedValue(response) }
}

describe('loadAwaitingAcceptancePrns', () => {
  test('asks the API for the notes acceptable into the year and returns them as given', async () => {
    const api = apiReturning({
      prns: [standard2026, december2026],
      total: 2
    })

    const result = await loadAwaitingAcceptancePrns(api, 'org-1', {
      year: 2026
    })

    expect(api.getOrganisationPrns).toHaveBeenCalledTimes(1)
    expect(api.getOrganisationPrns).toHaveBeenCalledWith('org-1', {
      search: undefined,
      material: undefined,
      sort: undefined,
      status: 'AwaitingAcceptance',
      acceptableIntoYear: 2026,
      page: 1,
      pageSize: 20
    })
    expect(result).toEqual({
      prns: [standard2026, december2026],
      total: 2,
      page: 1,
      pageSize: 20
    })
  })

  test('passes search, material, sort and paging through to the API', async () => {
    const api = apiReturning({ prns: [], total: 45 })

    const result = await loadAwaitingAcceptancePrns(api, 'org-1', {
      year: 2027,
      search: 'x',
      material: 'Glass',
      sort: 'tonnage-desc',
      page: 3,
      pageSize: 10
    })

    expect(api.getOrganisationPrns).toHaveBeenCalledWith('org-1', {
      search: 'x',
      material: 'Glass',
      sort: 'tonnage-desc',
      status: 'AwaitingAcceptance',
      acceptableIntoYear: 2027,
      page: 3,
      pageSize: 10
    })
    expect(result).toEqual({ prns: [], total: 45, page: 3, pageSize: 10 })
  })

  test('does not filter the notes itself', async () => {
    const api = apiReturning({
      prns: [{ id: 'other-year', obligationYear: 2020 }],
      total: 1
    })

    const result = await loadAwaitingAcceptancePrns(api, 'org-1', {
      year: 2026
    })

    expect(result.prns).toEqual([{ id: 'other-year', obligationYear: 2020 }])
  })
})

describe('countAcceptablePrnsForYear', () => {
  test('uses the API total for the year, so it equals the list total', async () => {
    const api = apiReturning({ prns: [standard2026], total: 14 })

    const count = await countAcceptablePrnsForYear(api, 'org-1', 2027)

    expect(count).toBe(14)
    expect(api.getOrganisationPrns).toHaveBeenCalledWith('org-1', {
      status: 'AwaitingAcceptance',
      acceptableIntoYear: 2027,
      page: 1,
      pageSize: 1
    })
  })
})
