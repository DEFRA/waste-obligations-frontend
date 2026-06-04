import Joi from 'joi'
import { describe, expect, test } from 'vitest'

import {
  ApiRequestValidationError,
  validateApiRequest
} from '#/server/services/schemas/validate-api-request.js'
import { createComplianceDeclarationRequestSchema } from '#/server/services/schemas/waste-obligations.schemas.js'

describe('validateApiRequest', () => {
  test('returns validated value when schema passes', () => {
    const value = validateApiRequest(
      Joi.object({ count: Joi.number().required() }),
      { count: 1 },
      'test-api'
    )

    expect(value).toEqual({ count: 1 })
  })

  test('throws ApiRequestValidationError when schema fails', () => {
    expect(() =>
      validateApiRequest(
        createComplianceDeclarationRequestSchema,
        { obligationYear: 1999 },
        'waste-obligations'
      )
    ).toThrow(ApiRequestValidationError)

    try {
      validateApiRequest(
        createComplianceDeclarationRequestSchema,
        { obligationYear: 1999 },
        'waste-obligations'
      )
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestValidationError)
      expect(error.serviceName).toBe('waste-obligations')
      expect(error.validationMessages.length).toBeGreaterThan(0)
    }
  })
})
