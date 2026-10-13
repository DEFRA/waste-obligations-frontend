import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import { currentComplianceScheme } from '#/server/routes/_shared/compliance/_middlewares/current-compliance-scheme.js'
import {
  prnsParamsSchema,
  prnsQuerySchema,
  yearQuerySchema,
  prnIdParamsSchema
} from './schema.js'

export function singlePrn(...handlers) {
  return [currentOrganisation, approvedUser, ...handlers]
}
export function selectProducerPrns(...handlers) {
  return [currentOrganisation, approvedUser, ...handlers]
}

// CSO routes carry `{schemeId}` in the path, not `{organisationId}`, so they
// authorise access via the compliance scheme the user operates rather than a
// direct organisation enrolment.
export function singleSchemePrn(...handlers) {
  return [currentComplianceScheme, approvedUser, ...handlers]
}
export function selectSchemePrns(...handlers) {
  return [currentComplianceScheme, approvedUser, ...handlers]
}
export const prnRouteOptions = {
  validate: {
    params: prnIdParamsSchema,
    query: yearQuerySchema,
    failAction: renderValidationFailAction
  }
}

export const prnsRouteOptions = {
  validate: {
    params: prnsParamsSchema,
    query: prnsQuerySchema,
    failAction: renderValidationFailAction
  }
}
