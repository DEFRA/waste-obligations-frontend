import Joi from 'joi'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import { guidSchema } from '#/server/services/schemas/common.js'
import {
  prnSortSchema,
  prnStatusSchema
} from '#/server/services/schemas/waste-obligations.schemas.js'

const MAX_YEAR = new Date().getFullYear()

export const organisationParamsSchema = Joi.object({
  organisationId: guidSchema.required()
})

export const selectedPrnParamsSchema = organisationParamsSchema.keys({
  prnId: guidSchema.required()
})

export const organisationQuerySchema = Joi.object({
  year: Joi.number().integer().min(COMPLIANCE_MIN_YEAR).max(MAX_YEAR).required()
}).unknown(true)

export const organisationPrnsQuerySchema = Joi.object({
  search: Joi.string().trim().optional(),
  status: prnStatusSchema.optional(),
  sort: prnSortSchema.optional(),
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(100).optional()
}).unknown(true)
