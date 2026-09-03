import { describe, expect, test } from 'vitest'

import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { currentComplianceScheme } from '#/server/routes/_shared/compliance/_middlewares/current-compliance-scheme.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import {
  prnsRouteOptions,
  prnRouteOptions,
  selectProducerPrns,
  singlePrn,
  selectSchemePrns,
  singleSchemePrn
} from './prns-route-options.js'
import {
  prnsParamsSchema,
  prnsQuerySchema,
  yearQuerySchema,
  prnIdParamsSchema
} from './schema.js'

describe('pre-handler chains', () => {
  test('singlePrn prepends currentOrganisation and approvedUser', () => {
    const handler = () => {}

    expect(singlePrn(handler)).toEqual([
      currentOrganisation,
      approvedUser,
      handler
    ])
  })

  test('selectProducerPrns prepends currentOrganisation and approvedUser', () => {
    const handlerOne = () => {}
    const handlerTwo = () => {}

    expect(selectProducerPrns(handlerOne, handlerTwo)).toEqual([
      currentOrganisation,
      approvedUser,
      handlerOne,
      handlerTwo
    ])
  })

  test('singleSchemePrn prepends currentComplianceScheme and approvedUser', () => {
    const handler = () => {}

    expect(singleSchemePrn(handler)).toEqual([
      currentComplianceScheme,
      approvedUser,
      handler
    ])
  })

  test('selectSchemePrns prepends currentComplianceScheme and approvedUser', () => {
    const handlerOne = () => {}
    const handlerTwo = () => {}

    expect(selectSchemePrns(handlerOne, handlerTwo)).toEqual([
      currentComplianceScheme,
      approvedUser,
      handlerOne,
      handlerTwo
    ])
  })
})

describe('prnRouteOptions', () => {
  test('validates params against prnIdParamsSchema and query against yearQuerySchema', () => {
    expect(prnRouteOptions.validate.params).toBe(prnIdParamsSchema)
    expect(prnRouteOptions.validate.query).toBe(yearQuerySchema)
  })

  test('uses renderValidationFailAction for failAction', () => {
    expect(prnRouteOptions.validate.failAction).toBe(renderValidationFailAction)
  })
})

describe('prnsRouteOptions', () => {
  test('validates params against prnsParamsSchema and query against prnsQuerySchema', () => {
    expect(prnsRouteOptions.validate.params).toBe(prnsParamsSchema)
    expect(prnsRouteOptions.validate.query).toBe(prnsQuerySchema)
  })

  test('uses renderValidationFailAction for failAction', () => {
    expect(prnsRouteOptions.validate.failAction).toBe(
      renderValidationFailAction
    )
  })
})
