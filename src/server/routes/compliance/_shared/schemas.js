import Joi from 'joi'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import {
  guidSchema,
  mongoObjectIdSchema
} from '#/server/services/schemas/common.js'

const MAX_YEAR = new Date().getFullYear()

export const complianceParamsSchema = Joi.object({
  organisationId: guidSchema.required()
})

export const complianceQuerySchema = Joi.object({
  year: Joi.number().integer().min(COMPLIANCE_MIN_YEAR).max(MAX_YEAR).required()
}).unknown(true)

export const complianceDeclarationRouteQuerySchema = Joi.object({}).unknown(
  true
)

export const certificateSuccessParamsSchema = complianceParamsSchema.keys({
  complianceDeclarationId: mongoObjectIdSchema.required()
})

export const certificateViewParamsSchema = complianceParamsSchema.keys({
  complianceDeclarationId: mongoObjectIdSchema.required()
})
