import { describe, expect, test, vi } from 'vitest'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import { getComplianceYear } from '#/server/common/helpers/compliance-year.js'
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

  test('accepts the current compliance year', () => {
    const currentYear = getComplianceYear()
    const value = validateRedisCache(
      complianceQuerySchema,
      { year: currentYear },
      'compliance-query'
    )

    expect(value.year).toBe(currentYear)
  })

  test('rejects the next compliance year', () => {
    expect(() =>
      validateRedisCache(
        complianceQuerySchema,
        { year: getComplianceYear() + 1 },
        'compliance-query'
      )
    ).toThrow()
  })

  test.each([
    ['31 Jan 2027 (still 2026)', '2027-01-31T23:59:00Z', 2026, 2027],
    ['1 Feb 2027 (now 2027)', '2027-02-01T00:00:00Z', 2027, 2028],
    ['1 Dec 2026', '2026-12-01T12:00:00Z', 2026, 2027]
  ])(
    'limits the year to the compliance year at %s',
    (_label, iso, allowedYear, rejectedYear) => {
      vi.useFakeTimers({ now: new Date(iso), toFake: ['Date'] })

      try {
        expect(
          validateRedisCache(
            complianceQuerySchema,
            { year: allowedYear },
            'compliance-query'
          ).year
        ).toBe(allowedYear)
        expect(() =>
          validateRedisCache(
            complianceQuerySchema,
            { year: rejectedYear },
            'compliance-query'
          )
        ).toThrow()
      } finally {
        vi.useRealTimers()
      }
    }
  )

  test('rejects missing year', () => {
    expect(() =>
      validateRedisCache(complianceQuerySchema, {}, 'compliance-query')
    ).toThrow()
  })
})
