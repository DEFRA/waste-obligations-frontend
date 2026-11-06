import { describe, expect, test } from 'vitest'

import {
  csoObligationMaterialParamsSchema,
  csoObligationsParamsSchema,
  obligationsYearQuerySchema,
  producerObligationMaterialParamsSchema,
  producerObligationsParamsSchema
} from './schema.js'

const currentYear = new Date().getFullYear()
const validGuid = 'd8f98659-87d8-4ef4-a9f2-e72f1bc98423'

describe('obligations schema', () => {
  test('accepts a valid producer organisation id', () => {
    const { error, value } = producerObligationsParamsSchema.validate({
      organisationId: validGuid
    })

    expect(error).toBeUndefined()
    expect(value.organisationId).toBe(validGuid)
  })

  test('rejects an invalid producer organisation id', () => {
    const { error } = producerObligationsParamsSchema.validate({
      organisationId: 'not-a-guid'
    })

    expect(error).toBeDefined()
  })

  test('accepts a valid CSO scheme id', () => {
    const { error, value } = csoObligationsParamsSchema.validate({
      schemeId: validGuid
    })

    expect(error).toBeUndefined()
    expect(value.schemeId).toBe(validGuid)
  })

  test('rejects an omitted year query', () => {
    const { error } = obligationsYearQuerySchema.validate({})

    expect(error).toBeDefined()
  })

  test.each([-5, 0, 1e21, 2101])('rejects the nonsense year %s', (year) => {
    expect(obligationsYearQuerySchema.validate({ year }).error).toBeDefined()
  })

  test.each([1999, 2025, currentYear, currentYear + 1, 2100])(
    'accepts the whole year %i, leaving the year rule to decide what to show',
    (year) => {
      const { error, value } = obligationsYearQuerySchema.validate({ year })

      expect(error).toBeUndefined()
      expect(value.year).toBe(year)
    }
  )

  test.each(['abc', '2026.5', ''])('rejects the year "%s"', (year) => {
    const { error } = obligationsYearQuerySchema.validate({ year })

    expect(error).toBeDefined()
  })
})

describe('obligation material params schemas', () => {
  const guid = 'd8f98659-87d8-4ef4-a9f2-e72f1bc98423'

  test.each(['aluminium', 'glass', 'paper', 'plastic', 'steel', 'wood'])(
    'accepts the %s page for a producer and a compliance scheme',
    (material) => {
      expect(
        producerObligationMaterialParamsSchema.validate({
          organisationId: guid,
          material
        }).error
      ).toBeUndefined()
      expect(
        csoObligationMaterialParamsSchema.validate({
          schemeId: guid,
          material
        }).error
      ).toBeUndefined()
    }
  )

  test.each(['glass-remelt', 'totals', 'Aluminium', '', 'tin'])(
    'rejects "%s" as a material',
    (material) => {
      expect(
        producerObligationMaterialParamsSchema.validate({
          organisationId: guid,
          material
        }).error
      ).toBeDefined()
    }
  )

  test('rejects an organisation id that is not a GUID', () => {
    expect(
      producerObligationMaterialParamsSchema.validate({
        organisationId: 'not-a-guid',
        material: 'wood'
      }).error
    ).toBeDefined()
  })
})
