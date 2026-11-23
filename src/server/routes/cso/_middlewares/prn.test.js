import { describe, test, expect, vi } from 'vitest'
import Boom from '@hapi/boom'

import { ApiError } from '#/server/services/base/api-error.js'
import { prn } from './prn.js'

describe('prn middleware', () => {
  test('returns the PRN from the API', async () => {
    const prnDetail = { id: 'prn-uuid-1', prnNumber: 'PRN123' }
    const getPrn = vi.fn().mockResolvedValue(prnDetail)
    const request = {
      params: { schemeId: 'scheme-uuid-1', prnId: 'prn-uuid-1' },
      logger: { warn: vi.fn() },
      server: { app: { wasteObligationsApi: { getPrn } } }
    }

    const result = await prn.method(request)

    expect(getPrn).toHaveBeenCalledWith('scheme-uuid-1', 'prn-uuid-1')
    expect(result).toBe(prnDetail)
  })

  test('returns bad implementation and logs when PRN API throws', async () => {
    const err = new Error('upstream unavailable')
    const getPrn = vi.fn().mockRejectedValue(err)
    const request = {
      params: { schemeId: 'scheme-uuid-2', prnId: 'prn-uuid-2' },
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

  test('returns not found when the API says the PRN does not exist', async () => {
    const notFoundError = Object.assign(new Error('not found'), {
      status: 404
    })
    const getPrn = vi.fn().mockRejectedValue(notFoundError)
    const request = {
      params: { schemeId: 'scheme-uuid-3', prnId: 'prn-uuid-3' },
      logger: { warn: vi.fn() },
      server: { app: { wasteObligationsApi: { getPrn } } }
    }

    await expect(prn.method(request)).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
    expect(request.logger.warn).toHaveBeenCalledWith(
      { err: notFoundError },
      'Failed to load PRN: prnId=prn-uuid-3'
    )
  })

  test('returns not found for the real API client error for a missing PRN', async () => {
    const notFoundError = new ApiError({ status: 404, title: 'Not Found' })
    const getPrn = vi.fn().mockRejectedValue(notFoundError)
    const request = {
      params: { schemeId: 'scheme-uuid-4', prnId: 'prn-uuid-4' },
      logger: { warn: vi.fn() },
      server: { app: { wasteObligationsApi: { getPrn } } }
    }

    await expect(prn.method(request)).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 }
    })
    expect(request.logger.warn).toHaveBeenCalledWith(
      { err: notFoundError },
      'Failed to load PRN: prnId=prn-uuid-4'
    )
  })
})
