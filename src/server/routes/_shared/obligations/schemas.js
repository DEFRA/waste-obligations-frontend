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

export { obligationsYearQuerySchema as obligationsQuerySchema } from './schema.js'
