import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest'
import Boom from '@hapi/boom'

import { awaitingAcceptancePrns } from './awaiting-acceptance-prns.js'

// Acceptance years follow the clock. Freeze it so a 2026 note still counts
// towards 2026 after the compliance year rolls on 1 February 2027.
const JUNE_2026 = new Date('2026-06-15T12:00:00Z')

describe('awaitingAcceptancePrns middleware', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(JUNE_2026)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('counts only PRNs that can be accepted into the requested year', async () => {
    const response = {
      prns: [
        { id: '1', obligationYear: 2026 },
        { id: '2', obligationYear: 2025 },
        { id: '3', obligationYear: 2026 }
      ],
      total: 3,
      page: 1,
      pageSize: 100
    }
    const getOrganisationPrns = vi.fn().mockResolvedValue(response)
    const request = {
      params: { organisationId: 'org-uuid-1' },
      query: { year: 2026 },
      server: { app: { wasteObligationsApi: { getOrganisationPrns } } }
    }

    const result = await awaitingAcceptancePrns.method(request)

    expect(getOrganisationPrns).toHaveBeenCalledWith('org-uuid-1', {
      status: 'AwaitingAcceptance',
      page: 1,
      pageSize: 100
    })
    expect(result.total).toBe(2)
    expect(result.prns).toHaveLength(2)
    expect(result.prns.every((prn) => prn.obligationYear === 2026)).toBe(true)
  })

  test('uses schemeId when organisationId is not in route params', async () => {
    const getOrganisationPrns = vi.fn().mockResolvedValue({
      prns: [],
      total: 0,
      page: 1,
      pageSize: 100
    })
    const request = {
      params: { schemeId: 'scheme-uuid-1' },
      query: { year: 2026 },
      server: { app: { wasteObligationsApi: { getOrganisationPrns } } }
    }

    await awaitingAcceptancePrns.method(request)

    expect(getOrganisationPrns).toHaveBeenCalledWith('scheme-uuid-1', {
      status: 'AwaitingAcceptance',
      page: 1,
      pageSize: 100
    })
  })

  test('pages through results when total exceeds page size', async () => {
    const getOrganisationPrns = vi
      .fn()
      .mockResolvedValueOnce({
        prns: Array.from({ length: 100 }, (_, index) => ({
          id: `a-${index}`,
          obligationYear: 2026
        })),
        total: 101,
        page: 1,
        pageSize: 100
      })
      .mockResolvedValueOnce({
        prns: [{ id: 'b-0', obligationYear: 2025 }],
        total: 101,
        page: 2,
        pageSize: 100
      })
    const request = {
      params: { organisationId: 'org-uuid-1' },
      query: { year: 2026 },
      server: { app: { wasteObligationsApi: { getOrganisationPrns } } }
    }

    const result = await awaitingAcceptancePrns.method(request)

    expect(getOrganisationPrns).toHaveBeenCalledTimes(2)
    expect(result.total).toBe(100)
  })

  test('throws bad implementation and logs when API throws', async () => {
    const err = new Error('upstream unavailable')
    const getOrganisationPrns = vi.fn().mockRejectedValue(err)
    const request = {
      params: { organisationId: 'org-uuid-1' },
      query: { year: 2026 },
      logger: { warn: vi.fn(), error: vi.fn() },
      server: { app: { wasteObligationsApi: { getOrganisationPrns } } }
    }

    try {
      await awaitingAcceptancePrns.method(request)
      expect.fail('Expected to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(500)
    }

    expect(request.logger.warn).toHaveBeenCalledWith(
      { err },
      'Failed to load awaiting acceptance PRNs: organisationId=org-uuid-1, year=2026'
    )
  })
})
