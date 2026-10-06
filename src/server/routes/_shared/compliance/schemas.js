import Joi from 'joi'

import { getComplianceYear } from '#/server/common/helpers/compliance-year.js'
import { complianceYearSchema } from '#/server/common/helpers/compliance-year-schema.js'
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

// Declarations can only be submitted for the current compliance year. Unlike the
// obligations and PRN pages, the next year is not allowed here.
export const complianceQuerySchema = Joi.object({
  year: complianceYearSchema(getComplianceYear).required()
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
