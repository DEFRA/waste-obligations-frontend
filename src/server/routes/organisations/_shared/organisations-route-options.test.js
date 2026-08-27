import { describe, expect, test } from 'vitest'

import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import {
  organisationPrnsRouteOptions,
  organisationsRouteOptions,
  producerCompliancePre,
  producerComplianceViewPre,
  selectOrganisationPrns,
  selectSinglePrn
} from './organisations-route-options.js'
import {
  organisationParamsSchema,
  organisationPrnsQuerySchema,
  organisationQuerySchema,
  selectedPrnParamsSchema
} from './schema.js'

describe('pre-handler chains', () => {
  test('selectSinglePrn prepends currentOrganisation and approvedUser', () => {
    const handler = () => {}

    expect(selectSinglePrn(handler)).toEqual([
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

  test('producerCompliancePre prepends currentOrganisation and approvedUser', () => {
    const handler = () => {}

    expect(producerCompliancePre(handler)).toEqual([
      currentOrganisation,
      approvedUser,
      handler
    ])
  })

  test('producerComplianceViewPre prepends only currentOrganisation', () => {
    const handler = () => {}

    expect(producerComplianceViewPre(handler)).toEqual([
      currentOrganisation,
      handler
    ])
  })
})

describe('organisationsRouteOptions', () => {
  test('validates params against selectedPrnParamsSchema and query against organisationQuerySchema', () => {
    expect(organisationsRouteOptions.validate.params).toBe(
      selectedPrnParamsSchema
    )
    expect(organisationsRouteOptions.validate.query).toBe(
      organisationQuerySchema
    )
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
