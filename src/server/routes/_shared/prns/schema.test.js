import { describe, expect, test } from 'vitest'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import { getMaxQueryYear } from '#/server/common/helpers/compliance-year.js'
import { validateRedisCache } from '#/server/common/helpers/validate-redis-cache.js'
import {
  prnsParamsSchema,
  prnsQuerySchema,
  yearQuerySchema,
  prnIdParamsSchema
} from './schema.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const schemeId = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890'
const prnId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'
const currentYear = new Date().getFullYear()
const maxQueryYear = getMaxQueryYear()

describe('prnsParamsSchema', () => {
  test('accepts a valid organisation id', () => {
    const value = validateRedisCache(
      prnsParamsSchema,
      { organisationId },
      'prns-params'
    )

    expect(value.organisationId).toBe(organisationId)
  })

  test('accepts a valid scheme id', () => {
    const value = validateRedisCache(
      prnsParamsSchema,
      { schemeId },
      'prns-params'
    )

    expect(value.schemeId).toBe(schemeId)
  })

  test('rejects a non-guid organisation id', () => {
    expect(() =>
      validateRedisCache(
        prnsParamsSchema,
        { organisationId: 'not-a-guid' },
        'prns-params'
      )
    ).toThrow()
  })

  test('rejects both organisation id and scheme id', () => {
    expect(() =>
      validateRedisCache(
        prnsParamsSchema,
        { organisationId, schemeId },
        'prns-params'
      )
    ).toThrow()
  })

  test('rejects a missing organisation id and scheme id', () => {
    expect(() =>
      validateRedisCache(prnsParamsSchema, {}, 'prns-params')
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

  test('accepts a valid scheme id and prn id', () => {
    const value = validateRedisCache(
      prnIdParamsSchema,
      { schemeId, prnId },
      'selected-prn-params'
    )

    expect(value.schemeId).toBe(schemeId)
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

  test('accepts the next compliance year', () => {
    const value = validateRedisCache(
      yearQuerySchema,
      { year: maxQueryYear },
      'organisation-query'
    )

    expect(value.year).toBe(maxQueryYear)
  })

  test('rejects a year beyond the next compliance year', () => {
    expect(() =>
      validateRedisCache(
        yearQuerySchema,
        { year: maxQueryYear + 1 },
        'organisation-query'
      )
    ).toThrow()
  })
})

describe('prnsQuerySchema', () => {
  test('accepts a missing year', () => {
    const value = validateRedisCache(prnsQuerySchema, {}, 'prns-query')

    expect(value).toEqual({})
  })

  test('accepts a fully populated query and allows unknown params', () => {
    const value = validateRedisCache(
      prnsQuerySchema,
      {
        search: '  Acme  ',
        status: 'Accepted',
        sort: 'IssuedAtDescending',
        page: 2,
        pageSize: 50,
        year: currentYear,
        lang: 'cy'
      },
      'prns-query'
    )

    expect(value).toMatchObject({
      search: 'Acme',
      status: 'Accepted',
      sort: 'IssuedAtDescending',
      page: 2,
      pageSize: 50,
      year: currentYear,
      lang: 'cy'
    })
  })

  test('rejects an invalid status', () => {
    expect(() =>
      validateRedisCache(
        prnsQuerySchema,
        { status: 'NotAStatus', year: currentYear },
        'prns-query'
      )
    ).toThrow()
  })

  test('rejects an invalid sort', () => {
    expect(() =>
      validateRedisCache(
        prnsQuerySchema,
        { sort: 'NotASort', year: currentYear },
        'prns-query'
      )
    ).toThrow()
  })

  test('rejects a page below 1', () => {
    expect(() =>
      validateRedisCache(
        prnsQuerySchema,
        { page: 0, year: currentYear },
        'prns-query'
      )
    ).toThrow()
  })

  test('rejects a pageSize above 100', () => {
    expect(() =>
      validateRedisCache(
        prnsQuerySchema,
        { pageSize: 101, year: currentYear },
        'prns-query'
      )
    ).toThrow()
  })
})
