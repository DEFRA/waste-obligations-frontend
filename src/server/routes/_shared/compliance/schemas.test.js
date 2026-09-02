import { describe, expect, test } from 'vitest'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import { validateRedisCache } from '#/server/common/helpers/validate-redis-cache.js'
import {
  csoParamsSchema,
  producerParamsSchema,
  complianceQuerySchema
} from './schemas.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

describe('producerParamsSchema', () => {
  test('accepts a valid organisation id', () => {
    const value = validateRedisCache(
      producerParamsSchema,
      { organisationId },
      'compliance-params'
    )

    expect(value.organisationId).toBe(organisationId)
  })

  test('rejects a non-guid organisation id', () => {
    expect(() =>
      validateRedisCache(
        producerParamsSchema,
        { organisationId: 'not-a-guid' },
        'compliance-params'
      )
    ).toThrow()
  })
})

describe('csoParamsSchema', () => {
  const schemeId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'

  test('accepts a valid scheme id', () => {
    const value = validateRedisCache(
      csoParamsSchema,
      { schemeId },
      'compliance-params'
    )

    expect(value.schemeId).toBe(schemeId)
  })

  test('rejects a non-guid scheme id', () => {
    expect(() =>
      validateRedisCache(
        csoParamsSchema,
        { schemeId: 'not-a-guid' },
        'compliance-params'
      )
    ).toThrow()
  })
})

describe('complianceQuerySchema', () => {
  test('accepts year and allows unknown query params', () => {
    const value = validateRedisCache(
      complianceQuerySchema,
      { year: 2026, lang: 'cy' },
      'compliance-query'
    )

    expect(value.year).toBe(2026)
    expect(value.lang).toBe('cy')
  })

  test('rejects year below COMPLIANCE_MIN_YEAR', () => {
    expect(() =>
      validateRedisCache(
        complianceQuerySchema,
        { year: COMPLIANCE_MIN_YEAR - 1 },
        'compliance-query'
      )
    ).toThrow()
  })

  test('rejects missing year', () => {
    expect(() =>
      validateRedisCache(complianceQuerySchema, {}, 'compliance-query')
    ).toThrow()
  })
})
