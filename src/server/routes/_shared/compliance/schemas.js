import Joi from 'joi'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import { getMaxQueryYear } from '#/server/common/helpers/compliance-year.js'
import {
  guidSchema,
  mongoObjectIdSchema
} from '#/server/services/schemas/common.js'

export const producerParamsSchema = Joi.object({
  organisationId: guidSchema.required()
})

export const csoParamsSchema = Joi.object({
  schemeId: guidSchema.required()
})

export const complianceQuerySchema = Joi.object({
  year: Joi.number()
    .integer()
    .min(COMPLIANCE_MIN_YEAR)
    .max(getMaxQueryYear())
    .required()
}).unknown(true)

export const complianceDeclarationRouteQuerySchema = Joi.object({}).unknown(
  true
)

export const certificateSuccessParamsSchema = producerParamsSchema.keys({
  complianceDeclarationId: mongoObjectIdSchema.required()
})

export const statementSuccessParamsSchema = csoParamsSchema.keys({
  complianceDeclarationId: mongoObjectIdSchema.required()
})

export const certificateViewParamsSchema = producerParamsSchema.keys({
  complianceDeclarationId: mongoObjectIdSchema.required()
})

export const statementViewParamsSchema = csoParamsSchema.keys({
  complianceDeclarationId: mongoObjectIdSchema.required()
})
