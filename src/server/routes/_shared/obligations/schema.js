import Joi from 'joi'

import { now } from '#/server/common/helpers/clock.js'
import { getMaxQueryYear } from '#/server/common/helpers/compliance-year.js'
import { complianceYearSchema } from '#/server/common/helpers/compliance-year-schema.js'
import { guidSchema } from '#/server/services/schemas/common.js'

export const producerObligationsParamsSchema = Joi.object({
  organisationId: guidSchema.required()
})

export const csoObligationsParamsSchema = Joi.object({
  schemeId: guidSchema.required()
})

export const obligationsQuerySchema = Joi.object({
  year: complianceYearSchema(() => getMaxQueryYear(now())).required()
}).unknown(true)
