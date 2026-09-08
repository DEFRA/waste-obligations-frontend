import Joi from 'joi'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const configGet = vi.hoisted(() => vi.fn())
const logApplicationError = vi.hoisted(() => vi.fn())
const logger = vi.hoisted(() => ({ warn: vi.fn() }))

vi.mock('#/config/config.js', () => ({
  config: { get: configGet }
}))

vi.mock('#/server/common/helpers/logging/application-error.js', () => ({
  logApplicationError
}))

vi.mock('#/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => logger
}))

import {
  ApiResponseValidationError,
  validateApiResponse
} from '#/server/services/schemas/validate-api-response.js'
import { userOrganisationsResponseSchema } from '#/server/services/schemas/backend-account.schemas.js'

const invalidUserOrganisations = {
  user: {
    organisations: [{ id: 'not-a-guid' }]
  }
}

describe('validateApiResponse', () => {
  beforeEach(() => {
    configGet.mockReset()
    logApplicationError.mockReset()
    configGet.mockReturnValue(false)
  })

  test('returns validated value when schema passes', () => {
    const value = validateApiResponse(
      Joi.object({ count: Joi.number().required() }),
      { count: 1 },
      'test-api'
    )

    expect(value).toEqual({ count: 1 })
  })

  test('throws ApiResponseValidationError when schema fails outside production', () => {
    expect(() =>
      validateApiResponse(
        userOrganisationsResponseSchema,
        invalidUserOrganisations,
        'backend-account'
      )
    ).toThrow(ApiResponseValidationError)

    try {
      validateApiResponse(
        userOrganisationsResponseSchema,
        invalidUserOrganisations,
        'backend-account'
      )
    } catch (error) {
      expect(error).toBeInstanceOf(ApiResponseValidationError)
      expect(error.serviceName).toBe('backend-account')
      expect(error.validationMessages.length).toBeGreaterThan(0)
    }

    expect(logApplicationError).not.toHaveBeenCalled()
  })

  test('logs a warning and returns the response when schema fails in production', () => {
    configGet.mockReturnValue(true)

    const value = validateApiResponse(
      userOrganisationsResponseSchema,
      invalidUserOrganisations,
      'backend-account'
    )

    expect(value).toEqual(invalidUserOrganisations)
    expect(logApplicationError).toHaveBeenCalledWith(
      logger,
      'warn',
      expect.any(ApiResponseValidationError),
      'backend-account returned an unexpected response'
    )
  })
})
