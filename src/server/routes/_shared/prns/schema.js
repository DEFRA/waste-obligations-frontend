import Joi from 'joi'

import { getMaxQueryYear } from '#/server/common/helpers/compliance-year.js'
import { complianceYearSchema } from '#/server/common/helpers/compliance-year-schema.js'
import { guidSchema } from '#/server/services/schemas/common.js'
import {
  prnMaterialSchema,
  prnSortSchema,
  prnStatusSchema
} from '#/server/services/schemas/waste-obligations.schemas.js'

const yearSchema = complianceYearSchema(getMaxQueryYear)

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

// Matches the largest list page size, which is all one submission can select.
const MAX_SELECTED_PRNS = 100

// A single checked box arrives as a string; multiple boxes arrive as an array.
export const prnsListPayloadSchema = Joi.object({
  selectedPrnIds: Joi.array()
    .items(guidSchema)
    .single()
    .max(MAX_SELECTED_PRNS)
    .default([])
})

// Either a single PRN is removed from the selection, or the whole selection
// is abandoned via the "Go back" button - never both, never neither.
export const checkSelectionPayloadSchema = Joi.object({
  removePrnId: guidSchema,
  goBack: Joi.string().valid('true')
}).xor('removePrnId', 'goBack')
