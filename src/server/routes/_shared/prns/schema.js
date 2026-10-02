import Joi from 'joi'

import { COMPLIANCE_MIN_YEAR } from '#/config/constants.js'
import { getMaxQueryYear } from '#/server/common/helpers/compliance-year.js'
import { guidSchema } from '#/server/services/schemas/common.js'
import {
  prnMaterialSchema,
  prnSortSchema,
  prnStatusSchema
} from '#/server/services/schemas/waste-obligations.schemas.js'

const yearSchema = Joi.number()
  .integer()
  .min(COMPLIANCE_MIN_YEAR)
  .max(getMaxQueryYear())

// Producer routes carry `{organisationId}` in the path, CSO routes carry
// `{schemeId}`. Both resolve to the same downstream id (see
// resolveComplianceOrganisationId), so accept exactly one of them.
export const prnsParamsSchema = Joi.object({
  organisationId: guidSchema,
  schemeId: guidSchema
}).xor('organisationId', 'schemeId')

export const prnIdParamsSchema = prnsParamsSchema.keys({
  prnId: guidSchema.required()
})

// `year` is optional: list links from Manage Obligations supply it, but the
// list and detail pages also load without it. Missing year must not fail
// validation.
export const yearQuerySchema = Joi.object({
  year: yearSchema.optional()
}).unknown(true)

export const prnsQuerySchema = yearQuerySchema.keys({
  search: Joi.string().trim().optional(),
  status: prnStatusSchema.optional(),
  sort: prnSortSchema.optional(),
  // "All materials" submits an empty value; treat it as no filter.
  material: prnMaterialSchema.empty('').optional(),
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(100).optional()
})

// A single checked box arrives as a string; multiple boxes arrive as an array.
export const prnsListPayloadSchema = Joi.object({
  selectedPrnIds: Joi.array().items(guidSchema).single().default([])
})
