import { describe, test, expect, vi } from 'vitest'
import Boom from '@hapi/boom'

import { awaitingAcceptancePrns } from './awaiting-acceptance-prns.js'

function requestFor(getOrganisationPrns, overrides = {}) {
  return {
    params: { organisationId: 'org-uuid-1' },
    query: { year: 2026 },
    server: { app: { wasteObligationsApi: { getOrganisationPrns } } },
    ...overrides
  }
}

describe('awaitingAcceptancePrns middleware', () => {
  test('counts the notes the API says can be accepted into the requested year', async () => {
    const getOrganisationPrns = vi
      .fn()
      .mockResolvedValue({ prns: [{ id: '1' }], total: 12 })

    const result = await awaitingAcceptancePrns.method(
      requestFor(getOrganisationPrns)
    )

    expect(getOrganisationPrns).toHaveBeenCalledWith('org-uuid-1', {
      status: 'AwaitingAcceptance',
      acceptableIntoYear: 2026,
      page: 1,
      pageSize: 1
    })
    expect(result.total).toBe(12)
  })

  test('uses schemeId when organisationId is not in route params', async () => {
    const getOrganisationPrns = vi
      .fn()
      .mockResolvedValue({ prns: [], total: 0 })

    await awaitingAcceptancePrns.method(
      requestFor(getOrganisationPrns, {
        params: { schemeId: 'scheme-uuid-1' }
      })
    )

    expect(getOrganisationPrns).toHaveBeenCalledWith(
      'scheme-uuid-1',
      expect.objectContaining({ acceptableIntoYear: 2026 })
    )
  })

  test('throws bad implementation and logs when API throws', async () => {
    const err = new Error('upstream unavailable')
    const getOrganisationPrns = vi.fn().mockRejectedValue(err)
    const request = requestFor(getOrganisationPrns, {
      logger: { warn: vi.fn(), error: vi.fn() }
    })

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
