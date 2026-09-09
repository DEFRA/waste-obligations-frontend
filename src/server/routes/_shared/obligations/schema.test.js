import { describe, expect, test } from 'vitest'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import {
  csoObligationsParamsSchema,
  obligationsQuerySchema,
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

  test('allows an omitted year query', () => {
    const { error, value } = obligationsQuerySchema.validate({})

    expect(error).toBeUndefined()
    expect(value.year).toBeUndefined()
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

  test('rejects a year above the current year', () => {
    const { error } = obligationsQuerySchema.validate({
      year: currentYear + 1
    })

    expect(error).toBeDefined()
  })
})
