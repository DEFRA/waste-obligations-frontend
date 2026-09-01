import { describe, expect, test } from 'vitest'

import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { currentComplianceScheme } from '#/server/routes/compliance/_middlewares/current-compliance-scheme.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import {
  organisationPrnsRouteOptions,
  organisationsPrnRouteOptions,
  organisationPre,
  csoPre
} from './organisations-route-options.js'
import {
  organisationParamsSchema,
  organisationPrnsQuerySchema,
  yearQuerySchema,
  prnIdParamsSchema
} from './schema.js'

describe('pre-handler chains', () => {
  test('organisationPre prepends currentOrganisation and approvedUser to the given handlers', () => {
    const handlerOne = () => {}
    const handlerTwo = () => {}

    expect(organisationPre(handlerOne, handlerTwo)).toEqual([
      currentOrganisation,
      approvedUser,
      handlerOne,
      handlerTwo
    ])
  })

  test('csoPre prepends currentComplianceScheme and approvedUser to the given handlers', () => {
    const handlerOne = () => {}
    const handlerTwo = () => {}

    expect(csoPre(handlerOne, handlerTwo)).toEqual([
      currentComplianceScheme,
      approvedUser,
      handlerOne,
      handlerTwo
    ])
  })
})

describe('organisationsPrnRouteOptions', () => {
  test('validates params against prnIdParamsSchema and query against yearQuerySchema', () => {
    expect(organisationsPrnRouteOptions.validate.params).toBe(prnIdParamsSchema)
    expect(organisationsPrnRouteOptions.validate.query).toBe(yearQuerySchema)
  })

  test('uses renderValidationFailAction for failAction', () => {
    expect(organisationsPrnRouteOptions.validate.failAction).toBe(
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
