import { describe, expect, test } from 'vitest'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import { getMaxQueryYear } from '#/server/common/helpers/compliance-year.js'
import {
  csoObligationMaterialParamsSchema,
  csoObligationsParamsSchema,
  obligationsQuerySchema,
  producerObligationMaterialParamsSchema,
  producerObligationsParamsSchema
} from './schemas.js'

const currentYear = new Date().getFullYear()
const maxQueryYear = getMaxQueryYear()
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
    const { error } = obligationsQuerySchema.validate({})

    expect(error).toBeDefined()
  })

  test('accepts the current year', () => {
    const { error, value } = obligationsQuerySchema.validate({
      year: currentYear
    })

    expect(error).toBeUndefined()
    expect(value.year).toBe(currentYear)
  })

  test('rejects a year below the compliance minimum', () => {
    const { error } = obligationsQuerySchema.validate({
      year: COMPLIANCE_MIN_YEAR - 1
    })

    expect(error).toBeDefined()
  })

  test('accepts the next compliance year', () => {
    const { error, value } = obligationsQuerySchema.validate({
      year: maxQueryYear
    })

    expect(error).toBeUndefined()
    expect(value.year).toBe(maxQueryYear)
  })

  test('rejects a year beyond the next compliance year', () => {
    const { error } = obligationsQuerySchema.validate({
      year: maxQueryYear + 1
    })

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
