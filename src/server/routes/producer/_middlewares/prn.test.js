import { describe, test, expect, vi } from 'vitest'
import Boom from '@hapi/boom'

import { prn } from './prn.js'
import { ApiError } from '#/server/services/base/api-error.js'

describe('prn middleware', () => {
  test('returns the PRN from the API', async () => {
    const prnDetail = { id: 'prn-uuid-1', prnNumber: 'PRN123' }
    const getPrn = vi.fn().mockResolvedValue(prnDetail)
    const request = {
      params: { organisationId: 'org-uuid-1', prnId: 'prn-uuid-1' },
      logger: { warn: vi.fn() },
      server: { app: { wasteObligationsApi: { getPrn } } }
    }

    const result = await prn.method(request)

    expect(getPrn).toHaveBeenCalledWith('org-uuid-1', 'prn-uuid-1')
    expect(result).toBe(prnDetail)
  })

  test('returns bad implementation and logs when PRN API throws', async () => {
    const err = new Error('upstream unavailable')
    const getPrn = vi.fn().mockRejectedValue(err)
    const request = {
      params: { organisationId: 'org-uuid-2', prnId: 'prn-uuid-2' },
      logger: { warn: vi.fn() },
      server: { app: { wasteObligationsApi: { getPrn } } }
    }

    try {
      await prn.method(request)
      expect.fail('Expected impl to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(500)
    }

    expect(request.logger.warn).toHaveBeenCalledWith(
      { err },
      'Failed to load PRN: prnId=prn-uuid-2'
    )
  })

  test('throws not found when the API returns 404', async () => {
    const getPrn = vi.fn().mockRejectedValue(new ApiError({ status: 404 }))
    const request = {
      params: { organisationId: 'id-1', prnId: 'prn-uuid-2' },
      logger: { warn: vi.fn() },
      server: { app: { wasteObligationsApi: { getPrn } } }
    }

    try {
      await prn.method(request)
      expect.fail('Expected to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(404)
    }
  })
})
