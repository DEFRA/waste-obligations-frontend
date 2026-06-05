import Joi from 'joi'
import { describe, expect, test } from 'vitest'

import {
  RedisCacheValidationError,
  validateRedisCache
} from './validate-redis-cache.js'

describe('validateRedisCache', () => {
  const schema = Joi.object({ id: Joi.string().required() })

  test('returns validated value when schema passes', () => {
    expect(validateRedisCache(schema, { id: 'ok' }, 'test-cache')).toEqual({
      id: 'ok'
    })
  })

  test('throws RedisCacheValidationError when schema fails', () => {
    expect(() => validateRedisCache(schema, {}, 'test-cache')).toThrow(
      RedisCacheValidationError
    )

    try {
      validateRedisCache(schema, {}, 'test-cache')
    } catch (error) {
      expect(error).toMatchObject({
        name: 'RedisCacheValidationError',
        cacheLabel: 'test-cache',
        validationMessages: expect.any(Array)
      })
    }
  })
})
