import Joi from 'joi'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import { getMaxQueryYear } from '#/server/common/helpers/compliance-year.js'
import { guidSchema } from '#/server/services/schemas/common.js'

export const producerObligationsParamsSchema = Joi.object({
  organisationId: guidSchema.required()
})

export const csoObligationsParamsSchema = Joi.object({
  schemeId: guidSchema.required()
})

export const obligationsQuerySchema = Joi.object({
  year: Joi.number()
    .integer()
    .min(COMPLIANCE_MIN_YEAR)
    .max(getMaxQueryYear())
    .required()
}).unknown(true)
