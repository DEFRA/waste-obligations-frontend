import { describe, test, expect, vi } from 'vitest'
import Boom from '@hapi/boom'

import { prns } from './prns.js'

describe('prns middleware', () => {
  test('returns the paged PRNs from the API', async () => {
    const prnsPage = {
      prns: [{ id: 'prn-uuid-1' }],
      total: 1,
      page: 1,
      pageSize: 20
    }
    const getOrganisationPrns = vi.fn().mockResolvedValue(prnsPage)
    const request = {
      params: { organisationId: 'org-uuid-1' },
      query: {
        search: 'ACME',
        status: 'Accepted',
        sort: undefined,
        page: undefined,
        pageSize: undefined
      },
      logger: { warn: vi.fn() },
      server: { app: { wasteObligationsApi: { getOrganisationPrns } } }
    }

    const result = await prns.method(request)

    expect(getOrganisationPrns).toHaveBeenCalledWith('org-uuid-1', {
      search: 'ACME',
      status: 'Accepted',
      sort: undefined,
      page: undefined,
      pageSize: undefined
    })
    expect(result).toBe(prnsPage)
  })

  test('returns bad implementation and logs when PRNs API throws', async () => {
    const err = new Error('upstream unavailable')
    const getOrganisationPrns = vi.fn().mockRejectedValue(err)
    const request = {
      params: { organisationId: 'org-uuid-2' },
      query: {},
      logger: { warn: vi.fn() },
      server: { app: { wasteObligationsApi: { getOrganisationPrns } } }
    }

    try {
      await prns.method(request)
      expect.fail('Expected impl to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(500)
    }

    expect(request.logger.warn).toHaveBeenCalledWith(
      { err },
      'Failed to load PRNs: organisationId=org-uuid-2'
    )
  })
})
