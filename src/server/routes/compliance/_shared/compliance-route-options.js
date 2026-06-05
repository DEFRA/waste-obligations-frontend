import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { complianceParamsSchema, complianceQuerySchema } from './schemas.js'
import { currentOrganisation } from '../_middlewares/current-organisation.js'

export function compliancePre(...handlers) {
  return [currentOrganisation, ...handlers]
}

export const complianceRouteOptions = {
  validate: {
    params: complianceParamsSchema,
    query: complianceQuerySchema,
    failAction: renderValidationFailAction
  }
}
