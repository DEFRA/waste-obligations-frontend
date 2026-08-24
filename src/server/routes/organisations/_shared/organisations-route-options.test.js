import { describe, expect, test } from 'vitest'

import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { currentComplianceScheme } from '#/server/routes/compliance/_middlewares/current-compliance-scheme.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import {
  organisationPrnsRouteOptions,
  organisationsRouteOptions,
  selectOrganisationPrns,
  singlePrn,
  selectSchemePrns,
  singleSchemePrn
} from './organisations-route-options.js'
import {
  organisationParamsSchema,
  organisationPrnsQuerySchema,
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

  test('selectOrganisationPrns prepends currentOrganisation and approvedUser', () => {
    const handlerOne = () => {}
    const handlerTwo = () => {}

    expect(selectOrganisationPrns(handlerOne, handlerTwo)).toEqual([
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

describe('organisationsRouteOptions', () => {
  test('validates params against prnIdParamsSchema and query against yearQuerySchema', () => {
    expect(organisationsRouteOptions.validate.params).toBe(prnIdParamsSchema)
    expect(organisationsRouteOptions.validate.query).toBe(yearQuerySchema)
  })

  test('uses renderValidationFailAction for failAction', () => {
    expect(organisationsRouteOptions.validate.failAction).toBe(
      renderValidationFailAction
    )
  })
})

describe('organisationPrnsRouteOptions', () => {
  test('validates params against organisationParamsSchema and query against organisationPrnsQuerySchema', () => {
    expect(organisationPrnsRouteOptions.validate.params).toBe(
      organisationParamsSchema
    )
    expect(organisationPrnsRouteOptions.validate.query).toBe(
      organisationPrnsQuerySchema
    )
  })

  test('uses renderValidationFailAction for failAction', () => {
    expect(organisationPrnsRouteOptions.validate.failAction).toBe(
      renderValidationFailAction
    )
  })
})
