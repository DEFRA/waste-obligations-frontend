import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import {
  organisationParamsSchema,
  organisationPrnsQuerySchema,
  organisationQuerySchema,
  selectedPrnParamsSchema
} from './schema.js'

export function selectSinglePrn(...handlers) {
  return [currentOrganisation, approvedUser, ...handlers]
}
export function selectOrganisationPrns(...handlers) {
  return [currentOrganisation, approvedUser, ...handlers]
}
export function producerCompliancePre(...handlers) {
  return [currentOrganisation, approvedUser, ...handlers]
}

export function producerComplianceViewPre(...handlers) {
  return [currentOrganisation, ...handlers]
}
export const organisationsRouteOptions = {
  validate: {
    params: selectedPrnParamsSchema,
    query: organisationQuerySchema,
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
