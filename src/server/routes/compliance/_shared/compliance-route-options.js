import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import {
  complianceQuerySchema,
  producerParamsSchema,
  csoParamsSchema
} from './schemas.js'
import { currentOrganisation } from '../_middlewares/current-organisation.js'
import { currentComplianceScheme } from '../_middlewares/current-compliance-scheme.js'
import { approvedUser } from '../_middlewares/approved-user.js'

export function producerCompliancePre(...handlers) {
  return [currentOrganisation, approvedUser, ...handlers]
}

export function producerComplianceViewPre(...handlers) {
  return [currentOrganisation, ...handlers]
}

export function csoCompliancePre(...handlers) {
  return [currentComplianceScheme, approvedUser, ...handlers]
}

export function csoComplianceViewPre(...handlers) {
  return [currentComplianceScheme, ...handlers]
}

export const producerComplianceRouteOptions = {
  validate: {
    params: producerParamsSchema,
    query: complianceQuerySchema,
    failAction: renderValidationFailAction
  }
}

export const csoComplianceRouteOptions = {
  validate: {
    params: csoParamsSchema,
    query: complianceQuerySchema,
    failAction: renderValidationFailAction
  }
}
