import { describe, test, expect, vi } from 'vitest'

import { obligations } from './obligations.js'
import Boom from '@hapi/boom'

describe('obligations middleware', () => {
  test('returns bad implementation and logs when obligations API throws', async () => {
    const err = new Error('upstream unavailable')
    const getOrganisationObligations = vi.fn().mockRejectedValue(err)
    const request = {
      params: { organisationId: 'org-uuid-1' },
      query: { year: 2026 },
      app: { traceId: 'trace-1' },
      logger: { warn: vi.fn(), error: vi.fn() },
      server: { app: { wasteObligationsApi: { getOrganisationObligations } } }
    }

    try {
      await obligations.method(request)
      expect.fail('Expected impl to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(500)
    }

    expect(request.logger.warn).toHaveBeenCalledWith(
      { err },
      'Failed to load organisation obligations for certificate submit: organisationId=org-uuid-1, year=2026'
    )
  })
})
