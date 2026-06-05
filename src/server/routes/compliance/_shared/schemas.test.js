import { describe, expect, test } from 'vitest'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import { validateRedisCache } from '#/server/common/helpers/validate-redis-cache.js'
import { complianceParamsSchema, complianceQuerySchema } from './schemas.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

describe('complianceParamsSchema', () => {
  test('accepts a valid organisation id', () => {
    const value = validateRedisCache(
      complianceParamsSchema,
      { organisationId },
      'compliance-params'
    )

    expect(value.organisationId).toBe(organisationId)
  })

  test('rejects a non-guid organisation id', () => {
    expect(() =>
      validateRedisCache(
        complianceParamsSchema,
        { organisationId: 'not-a-guid' },
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
