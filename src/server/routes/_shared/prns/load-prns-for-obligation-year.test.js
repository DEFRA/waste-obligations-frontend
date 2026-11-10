import { describe, expect, test, vi } from 'vitest'

import { loadPrnsForObligationYear } from './load-prns-for-obligation-year.js'

const prn = (id, obligationYear) => ({ id, obligationYear })

describe('loadPrnsForObligationYear', () => {
  test('returns only the PRNs for the obligation year, in any status', async () => {
    const api = {
      getOrganisationPrns: vi.fn().mockResolvedValue({
        prns: [prn('a', 2025), prn('b', 2026), prn('c', 2025)],
        total: 3,
        page: 1,
        pageSize: 100
      })
    }

    const result = await loadPrnsForObligationYear(api, 'org', 2025)

    expect(result.map((item) => item.id)).toEqual(['a', 'c'])
    expect(api.getOrganisationPrns).toHaveBeenCalledWith('org', {
      page: 1,
      pageSize: 100
    })
  })

  test('walks every page in turn and keeps a repeated PRN once', async () => {
    const first = Array.from({ length: 100 }, (_, i) => prn(`p${i}`, 2025))
    const api = {
      getOrganisationPrns: vi
        .fn()
        .mockResolvedValueOnce({ prns: first, total: 102 })
        .mockResolvedValueOnce({
          prns: [prn('p99', 2025), prn('q1', 2025), prn('q2', 2024)],
          total: 102
        })
    }

    const result = await loadPrnsForObligationYear(api, 'org', 2025)

    expect(api.getOrganisationPrns).toHaveBeenCalledTimes(2)
    expect(api.getOrganisationPrns).toHaveBeenLastCalledWith('org', {
      page: 2,
      pageSize: 100
    })
    expect(result).toHaveLength(101)
  })

  test('stops on an empty page even if the total says there is more', async () => {
    const api = {
      getOrganisationPrns: vi.fn().mockResolvedValue({ prns: [], total: 500 })
    }

    expect(await loadPrnsForObligationYear(api, 'org', 2025)).toEqual([])
    expect(api.getOrganisationPrns).toHaveBeenCalledTimes(1)
  })
})
