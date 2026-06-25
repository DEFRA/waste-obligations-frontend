import Joi from 'joi'
import { WASTE_API_YEAR_MAX, WASTE_API_YEAR_MIN } from '#/config/constants.js'
import { guidSchema } from '#/server/services/schemas/common.js'
import {
  obligationSchema,
  obligationStatusSchema
} from '#/server/services/schemas/waste-obligations.schemas.js'
import { wasteOrganisationSchema } from '#/server/services/schemas/waste-organisations.schemas.js'

export const statementSubmitPostPayloadSchema = Joi.object({
  fullName: Joi.string().allow('').default(''),
  regulation43Compliant: Joi.string().valid('yes', 'no', '').default('')
})

export const statementSubmitCacheSchema = Joi.object({
  organisation: wasteOrganisationSchema.required(),
  schemeId: guidSchema.required(),
  obligationYear: Joi.number()
    .integer()
    .min(WASTE_API_YEAR_MIN)
    .max(WASTE_API_YEAR_MAX)
    .required(),
  obligations: Joi.array().items(obligationSchema).required(),
  obligationStatus: obligationStatusSchema.required(),
  regulatorName: Joi.string().required(),
  regulatorEmail: Joi.string().required(),
  organisationNumber: Joi.string().allow('').required()
}).unknown(false)
