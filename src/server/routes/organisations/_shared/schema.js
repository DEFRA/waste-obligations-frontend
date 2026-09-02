import Joi from 'joi'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import { guidSchema } from '#/server/services/schemas/common.js'
import {
  prnSortSchema,
  prnStatusSchema
} from '#/server/services/schemas/waste-obligations.schemas.js'

const MAX_YEAR = new Date().getFullYear()

// Producer routes carry `{organisationId}` in the path, CSO routes carry
// `{schemeId}`. Both resolve to the same downstream id (see
// resolveComplianceOrganisationId), so accept exactly one of them.
export const organisationParamsSchema = Joi.object({
  organisationId: guidSchema,
  schemeId: guidSchema
}).xor('organisationId', 'schemeId')

export const prnIdParamsSchema = organisationParamsSchema.keys({
  prnId: guidSchema.required()
})

// `year` is optional: list links always supply it, but direct links to a PRN
// may omit it. The controller falls back to the PRN's own obligation year (see
// resolvePrnYear), so a missing param must not fail validation.
export const yearQuerySchema = Joi.object({
  year: Joi.number().integer().min(COMPLIANCE_MIN_YEAR).max(MAX_YEAR).optional()
}).unknown(true)

export const organisationPrnsQuerySchema = Joi.object({
  search: Joi.string().trim().optional(),
  status: prnStatusSchema.optional(),
  sort: prnSortSchema.optional(),
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(100).optional()
}).unknown(true)
