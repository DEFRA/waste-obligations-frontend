import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import { currentComplianceScheme } from '#/server/routes/compliance/_middlewares/current-compliance-scheme.js'
import {
  organisationParamsSchema,
  organisationPrnsQuerySchema,
  yearQuerySchema,
  prnIdParamsSchema
} from './schema.js'

export function singlePrn(...handlers) {
  return [currentOrganisation, approvedUser, ...handlers]
}
export function selectOrganisationPrns(...handlers) {
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
export const organisationsRouteOptions = {
  validate: {
    params: prnIdParamsSchema,
    query: yearQuerySchema,
    failAction: renderValidationFailAction
  }
}

export const organisationPrnsRouteOptions = {
  validate: {
    params: organisationParamsSchema,
    query: organisationPrnsQuerySchema,
    failAction: renderValidationFailAction
  }
}
