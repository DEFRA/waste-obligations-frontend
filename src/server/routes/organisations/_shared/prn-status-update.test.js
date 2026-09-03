import { describe, expect, test, vi } from 'vitest'

import Boom from '@hapi/boom'
import { ApiError } from '#/server/services/base/api-error.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { submitPrnStatusUpdate } from './prn-status-update.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const schemeId = 'd1e2f3a4-b5c6-4d7e-8f90-1a2b3c4d5e6f'
const prnId = 'f2b1c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d'

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'test.user@example.com',
  firstName: 'Test',
  lastName: 'User'
}

function buildRequest(overrides = {}) {
  const { params, userOverrides, ...rest } = overrides
  return {
    params: { organisationId, prnId, ...params },
    yar: {
      get: vi.fn((key) =>
        key === 'user' ? (userOverrides ?? user) : undefined
      )
    },
    logger: { error: vi.fn(), warn: vi.fn() },
    server: {
      app: {
        wasteObligationsApi: {
          updatePrnStatus: vi.fn().mockResolvedValue(null)
        }
      }
    },
    ...rest
  }
}

describe('submitPrnStatusUpdate', () => {
  test('PATCHes the PRN status with the signed-in user and returns true', async () => {
    const request = buildRequest()

    const applied = await submitPrnStatusUpdate(request, 'ACCEPTED')

    expect(applied).toBe(true)
    expect(
      request.server.app.wasteObligationsApi.updatePrnStatus
    ).toHaveBeenCalledWith(organisationId, prnId, {
      status: 'ACCEPTED',
      user: {
        id: user.id,
        email: user.email,
        name: 'Test User',
        locale: 'en'
      }
    })
  })

  test('uses the schemeId param when there is no organisationId (CSO journey)', async () => {
    const request = buildRequest({
      params: { organisationId: undefined, schemeId }
    })

    await submitPrnStatusUpdate(request, 'ACCEPTED')

    expect(
      request.server.app.wasteObligationsApi.updatePrnStatus
    ).toHaveBeenCalledWith(schemeId, prnId, expect.anything())
  })

  test('falls back to the user email when the account has no first or last name', async () => {
    const request = buildRequest({
      userOverrides: {
        id: user.id,
        email: user.email,
        firstName: null,
        lastName: null
      }
    })

    await submitPrnStatusUpdate(request, 'ACCEPTED')

    expect(
      request.server.app.wasteObligationsApi.updatePrnStatus
    ).toHaveBeenCalledWith(
      organisationId,
      prnId,
      expect.objectContaining({
        user: expect.objectContaining({ name: user.email })
      })
    )
  })

  test.each([
    [statusCodes.conflict, 'already accepted'],
    [statusCodes.gone, 'PRN withdrawn'],
    [statusCodes.unprocessableEntity, 'PRN not in an acceptable state']
  ])(
    'returns false and logs a warning when the API reports a transition conflict (%i)',
    async (statusCode, message) => {
      const request = buildRequest()
      request.server.app.wasteObligationsApi.updatePrnStatus.mockRejectedValue(
        new ApiError({ status: statusCode, message })
      )

      const applied = await submitPrnStatusUpdate(request, 'ACCEPTED')

      expect(applied).toBe(false)
      expect(request.logger.warn).toHaveBeenCalled()
      expect(request.logger.error).not.toHaveBeenCalled()
    }
  )

  test.each([
    [statusCodes.badRequest, 'invalid payload'],
    [statusCodes.unauthorized, 'token expired'],
    [statusCodes.forbidden, 'forbidden'],
    [statusCodes.notFound, 'not found']
  ])(
    'throws a 500 and logs an error for a non-conflict 4xx (%i) — a real fault, not a swallowed no-op',
    async (statusCode, message) => {
      const request = buildRequest()
      request.server.app.wasteObligationsApi.updatePrnStatus.mockRejectedValue(
        new ApiError({ status: statusCode, message })
      )

      await expect(submitPrnStatusUpdate(request, 'ACCEPTED')).rejects.toThrow(
        Boom.badImplementation().message
      )
      expect(request.logger.error).toHaveBeenCalled()
    }
  )

  test('throws a 500 and logs an error when the API returns a 5xx', async () => {
    const request = buildRequest()
    request.server.app.wasteObligationsApi.updatePrnStatus.mockRejectedValue(
      new ApiError({
        status: statusCodes.serviceUnavailable,
        message: 'upstream down'
      })
    )

    await expect(submitPrnStatusUpdate(request, 'ACCEPTED')).rejects.toThrow(
      Boom.badImplementation().message
    )
    expect(request.logger.error).toHaveBeenCalled()
  })

  test('throws a 500 on a non-API error (network / request validation)', async () => {
    const request = buildRequest()
    request.server.app.wasteObligationsApi.updatePrnStatus.mockRejectedValue(
      new Error('fetch failed')
    )

    await expect(submitPrnStatusUpdate(request, 'ACCEPTED')).rejects.toThrow(
      Boom.badImplementation().message
    )
    expect(request.logger.error).toHaveBeenCalled()
  })
})
