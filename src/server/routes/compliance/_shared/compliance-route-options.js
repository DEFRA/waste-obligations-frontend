import Joi from 'joi'
import { renderValidationFailAction } from '#/server/common/helpers/validation-fail-action.js'
import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import { currentOrganisation } from '../_middlewares/current-organisation.js'

const MAX_YEAR = new Date().getFullYear()

const paramsSchema = Joi.object({
  organisationId: Joi.string()
    .guid({ version: ['uuidv4', 'uuidv5'] })
    .required()
})

const querySchema = Joi.object({
  year: Joi.number().integer().min(COMPLIANCE_MIN_YEAR).max(MAX_YEAR).required()
}).unknown(true)

export function compliancePre(...handlers) {
  return [currentOrganisation, ...handlers]
}

export const complianceRouteOptions = {
  validate: {
    params: paramsSchema,
    query: querySchema,
    failAction: renderValidationFailAction
  }
}
