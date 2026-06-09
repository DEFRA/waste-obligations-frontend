import { describe, test, expect, vi } from 'vitest'

import { declarations } from './declarations.js'

describe('declarations middleware', () => {
  test('returns null and logs when declarations API throws', async () => {
    const err = new Error('upstream unavailable')
    const getComplianceDeclarations = vi.fn().mockRejectedValue(err)
    const request = {
      params: { organisationId: 'org-uuid-2' },
      query: { year: 2025 },
      app: { traceId: null },
      logger: { warn: vi.fn(), error: vi.fn() },
      server: { app: { wasteObligationsApi: { getComplianceDeclarations } } }
    }

    const result = await declarations.method(request)

    expect(result).toBeNull()
    expect(request.logger.warn).toHaveBeenCalledWith(
      { err },
      'Failed to load compliance declarations: organisationId=org-uuid-2, year=2025'
    )
  })
})
