import { describe, expect, test } from 'vitest'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import { validateRedisCache } from '#/server/common/helpers/validate-redis-cache.js'
import {
  organisationParamsSchema,
  organisationPrnsQuerySchema,
  yearQuerySchema,
  prnIdParamsSchema
} from './schema.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const prnId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'
const currentYear = new Date().getFullYear()

describe('organisationParamsSchema', () => {
  test('accepts a valid organisation id', () => {
    const value = validateRedisCache(
      organisationParamsSchema,
      { organisationId },
      'organisation-params'
    )

    expect(value.organisationId).toBe(organisationId)
  })

  test('rejects a non-guid organisation id', () => {
    expect(() =>
      validateRedisCache(
        organisationParamsSchema,
        { organisationId: 'not-a-guid' },
        'organisation-params'
      )
    ).toThrow()
  })

  test('rejects a missing organisation id', () => {
    expect(() =>
      validateRedisCache(organisationParamsSchema, {}, 'organisation-params')
    ).toThrow()
  })
})

describe('prnIdParamsSchema', () => {
  test('accepts a valid organisation id and prn id', () => {
    const value = validateRedisCache(
      prnIdParamsSchema,
      { organisationId, prnId },
      'selected-prn-params'
    )

    expect(value.organisationId).toBe(organisationId)
    expect(value.prnId).toBe(prnId)
  })

  test('rejects a missing prn id', () => {
    expect(() =>
      validateRedisCache(
        prnIdParamsSchema,
        { organisationId },
        'selected-prn-params'
      )
    ).toThrow()
  })

  test('rejects a non-guid prn id', () => {
    expect(() =>
      validateRedisCache(
        prnIdParamsSchema,
        { organisationId, prnId: 'not-a-guid' },
        'selected-prn-params'
      )
    ).toThrow()
  })
})

describe('yearQuerySchema', () => {
  test('accepts a valid year and allows unknown query params', () => {
    const value = validateRedisCache(
      yearQuerySchema,
      { year: currentYear, lang: 'cy' },
      'organisation-query'
    )

    expect(value.year).toBe(currentYear)
    expect(value.lang).toBe('cy')
  })

  test('accepts a missing year', () => {
    const value = validateRedisCache(yearQuerySchema, {}, 'organisation-query')

    expect(value.year).toBeUndefined()
  })

  test('rejects a year below COMPLIANCE_MIN_YEAR', () => {
    expect(() =>
      validateRedisCache(
        yearQuerySchema,
        { year: COMPLIANCE_MIN_YEAR - 1 },
        'organisation-query'
      )
    ).toThrow()
  })

  test('rejects a year in the future', () => {
    expect(() =>
      validateRedisCache(
        yearQuerySchema,
        { year: currentYear + 1 },
        'organisation-query'
      )
    ).toThrow()
  })
})

describe('organisationPrnsQuerySchema', () => {
  test('accepts an empty query since all fields are optional', () => {
    const value = validateRedisCache(
      organisationPrnsQuerySchema,
      {},
      'organisation-prns-query'
    )

    expect(value).toEqual({})
  })

  test('accepts a fully populated query and allows unknown params', () => {
    const value = validateRedisCache(
      organisationPrnsQuerySchema,
      {
        search: '  Acme  ',
        status: 'Accepted',
        sort: 'IssuedAtDescending',
        page: 2,
        pageSize: 50,
        lang: 'cy'
      },
      'organisation-prns-query'
    )

    expect(value).toMatchObject({
      search: 'Acme',
      status: 'Accepted',
      sort: 'IssuedAtDescending',
      page: 2,
      pageSize: 50,
      lang: 'cy'
    })
  })

  test('rejects an invalid status', () => {
    expect(() =>
      validateRedisCache(
        organisationPrnsQuerySchema,
        { status: 'NotAStatus' },
        'organisation-prns-query'
      )
    ).toThrow()
  })

  test('rejects an invalid sort', () => {
    expect(() =>
      validateRedisCache(
        organisationPrnsQuerySchema,
        { sort: 'NotASort' },
        'organisation-prns-query'
      )
    ).toThrow()
  })

  test('rejects a page below 1', () => {
    expect(() =>
      validateRedisCache(
        organisationPrnsQuerySchema,
        { page: 0 },
        'organisation-prns-query'
      )
    ).toThrow()
  })

  test('rejects a pageSize above 100', () => {
    expect(() =>
      validateRedisCache(
        organisationPrnsQuerySchema,
        { pageSize: 101 },
        'organisation-prns-query'
      )
    ).toThrow()
  })
})
