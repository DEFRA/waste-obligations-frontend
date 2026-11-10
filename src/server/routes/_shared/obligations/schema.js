import Joi from 'joi'

import { guidSchema } from '#/server/services/schemas/common.js'
import { OBLIGATION_MATERIAL_SLUGS } from './obligation-materials.js'

export const producerObligationsParamsSchema = Joi.object({
  organisationId: guidSchema.required()
})

export const csoObligationsParamsSchema = Joi.object({
  schemeId: guidSchema.required()
})

const materialSchema = Joi.string()
  .valid(...OBLIGATION_MATERIAL_SLUGS)
  .required()

export const producerObligationMaterialParamsSchema =
  producerObligationsParamsSchema.keys({ material: materialSchema })

export const csoObligationMaterialParamsSchema =
  csoObligationsParamsSchema.keys({ material: materialSchema })

// Bounds that keep nonsense years (negative, huge) out of the redirect paths.
const MIN_QUERY_YEAR = 1900
const MAX_QUERY_YEAR = 2100

/**
 * The Manage Obligations pages accept any whole year from 1900 to 2100. A year
 * outside that range fails validation. Inside it, the year rule redirects: a
 * year up to and including the compliance record year goes to that year's
 * compliance record page, and any other year the user cannot choose goes to
 * the current compliance year.
 */
export const obligationsYearQuerySchema = Joi.object({
  year: Joi.number()
    .integer()
    .min(MIN_QUERY_YEAR)
    .max(MAX_QUERY_YEAR)
    .required()
}).unknown(true)
