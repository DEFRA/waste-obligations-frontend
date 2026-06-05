import Joi from 'joi'
import { describe, expect, test } from 'vitest'

import {
  ApiResponseValidationError,
  validateApiResponse
} from '#/server/services/schemas/validate-api-response.js'
import { userOrganisationsResponseSchema } from '#/server/services/schemas/backend-account.schemas.js'

describe('validateApiResponse', () => {
  test('returns validated value when schema passes', () => {
    const value = validateApiResponse(
      Joi.object({ count: Joi.number().required() }),
      { count: 1 },
      'test-api'
    )

    expect(value).toEqual({ count: 1 })
  })

  test('throws ApiResponseValidationError when schema fails', () => {
    expect(() =>
      validateApiResponse(
        userOrganisationsResponseSchema,
        {
          user: {
            organisations: [{ id: 'not-a-guid' }]
          }
        },
        'backend-account'
      )
    ).toThrow(ApiResponseValidationError)

    try {
      validateApiResponse(
        userOrganisationsResponseSchema,
        {
          user: {
            organisations: [{ id: 'not-a-guid' }]
          }
        },
        'backend-account'
      )
    } catch (error) {
      expect(error).toBeInstanceOf(ApiResponseValidationError)
      expect(error.serviceName).toBe('backend-account')
      expect(error.validationMessages.length).toBeGreaterThan(0)
    }
  })
})
