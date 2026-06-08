import { describe, test, expect, vi } from 'vitest'

import { declarations } from './declarations.js'
import Boom from '@hapi/boom'

describe('declarations middleware', () => {
  test('returns bad implementation and logs when declarations API throws', async () => {
    const err = new Error('upstream unavailable')
    const getComplianceDeclarations = vi.fn().mockRejectedValue(err)
    const request = {
      params: { organisationId: 'org-uuid-2' },
      query: { year: 2025 },
      app: { traceId: null },
      logger: { warn: vi.fn(), error: vi.fn() },
      server: { app: { wasteObligationsApi: { getComplianceDeclarations } } }
    }

    try {
      await declarations.method(request)
      expect.fail('Expected impl to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(500)
    }

    expect(request.logger.warn).toHaveBeenCalledWith(
      { err, organisationId: 'org-uuid-2', year: 2025 },
      'Failed to load compliance declarations'
    )
  })
})
