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

/**
 * Route `pre` list for producer routes (path carries `{organisationId}`):
 * authorise the signed-in user against a direct organisation enrolment, then
 * run the given route-specific pre-handlers.
 */
export function organisationPre(...handlers) {
  return [currentOrganisation, approvedUser, ...handlers]
}

/**
 * Route `pre` list for CSO routes (path carries `{schemeId}`): authorise via the
 * compliance scheme the user operates rather than a direct organisation
 * enrolment, then run the given route-specific pre-handlers.
 */
export function csoPre(...handlers) {
  return [currentComplianceScheme, approvedUser, ...handlers]
}
export const organisationsPrnRouteOptions = {
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
