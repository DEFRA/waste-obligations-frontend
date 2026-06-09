import { describe, test, expect, vi } from 'vitest'

import { obligations } from './obligations.js'

describe('obligations middleware', () => {
  test('returns null and logs when obligations API throws', async () => {
    const err = new Error('upstream unavailable')
    const getOrganisationObligations = vi.fn().mockRejectedValue(err)
    const request = {
      params: { organisationId: 'org-uuid-1' },
      query: { year: 2026 },
      app: { traceId: 'trace-1' },
      logger: { warn: vi.fn(), error: vi.fn() },
      server: { app: { wasteObligationsApi: { getOrganisationObligations } } }
    }

    const result = await obligations.method(request)

    expect(result).toBeNull()
    expect(request.logger.warn).toHaveBeenCalledWith(
      { err },
      'Failed to load organisation obligations for certificate submit: organisationId=org-uuid-1, year=2026'
    )
  })
})
