import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import {
  obligationsYearQuerySchema,
  producerObligationsParamsSchema,
  csoObligationsParamsSchema
} from './schema.js'
import {
  currentOrganisation,
  currentComplianceScheme
} from '#/server/routes/_shared/obligations/_middlewares/index.js'

// The home page is open to basic users too, so access is decided by the
// caller's own access middleware (allUsers), not approvedUser.
export function producerObligationsPre(...handlers) {
  return [currentOrganisation, ...handlers]
}

export function csoObligationsPre(...handlers) {
  return [currentComplianceScheme, ...handlers]
}

export const producerObligationsRouteOptions = {
  validate: {
    params: producerObligationsParamsSchema,
    query: obligationsYearQuerySchema,
    failAction: renderValidationFailAction
  }
}

export const csoObligationsRouteOptions = {
  validate: {
    params: csoObligationsParamsSchema,
    query: obligationsYearQuerySchema,
    failAction: renderValidationFailAction
  }
}
