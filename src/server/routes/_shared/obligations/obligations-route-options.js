import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import {
  obligationsQuerySchema,
  producerObligationsParamsSchema,
  csoObligationsParamsSchema
} from './schemas.js'
import {
  approvedUser,
  currentOrganisation,
  currentComplianceScheme
} from '#/server/routes/_shared/obligations/_middlewares/index.js'

export function producerObligationsPre(...handlers) {
  return [currentOrganisation, approvedUser, ...handlers]
}

export function csoObligationsPre(...handlers) {
  return [currentComplianceScheme, approvedUser, ...handlers]
}

export const producerObligationsRouteOptions = {
  validate: {
    params: producerObligationsParamsSchema,
    query: obligationsQuerySchema,
    failAction: renderValidationFailAction
  }
}

export const csoObligationsRouteOptions = {
  validate: {
    params: csoObligationsParamsSchema,
    query: obligationsQuerySchema,
    failAction: renderValidationFailAction
  }
}
