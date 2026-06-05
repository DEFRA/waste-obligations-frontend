/**
 * Joi schemas aligned with Waste Obligations OpenAPI v0.0.1.
 */
import Joi from 'joi'

import { WASTE_API_YEAR_MAX, WASTE_API_YEAR_MIN } from '#/config/constants.js'
import {
  guidSchema,
  mongoObjectIdSchema,
  nullableString
} from '#/server/services/schemas/common.js'

const obligationMaterialSchema = Joi.string().valid(
  'Plastic',
  'Glass',
  'Aluminium',
  'Steel',
  'Wood',
  'GlassRemelt',
  'Paper'
)

export const obligationStatusSchema = Joi.string().valid(
  'Met',
  'NotMet',
  'NoDataYet'
)

const declarationObligationStatusSchema = Joi.string().valid('Met', 'NotMet')

const nonNegativeInteger = Joi.number().integer().min(0)

export const obligationTonnagesSchema = Joi.object({
  material: nonNegativeInteger,
  awaitingAcceptance: nonNegativeInteger,
  accepted: nonNegativeInteger,
  outstanding: nonNegativeInteger,
  obligated: nonNegativeInteger
}).unknown(true)

export const obligationSchema = Joi.object({
  material: obligationMaterialSchema.required(),
  recyclingTarget: Joi.number().min(0).max(1),
  tonnages: obligationTonnagesSchema.required(),
  status: obligationStatusSchema.required()
}).unknown(true)

export const organisationObligationsResponseSchema = Joi.object({
  obligations: Joi.array().items(obligationSchema).default([])
}).unknown(true)

export const complianceDeclarationStatusSchema = Joi.string().valid(
  'Submitted',
  'Accepted',
  'Cancelled'
)

const obligationsAddressSchema = Joi.object({
  addressLine1: nullableString,
  addressLine2: nullableString,
  town: nullableString,
  county: nullableString,
  postcode: nullableString,
  country: nullableString
})

const obligationsRegistrationTypeSchema = Joi.string().valid(
  'DirectProducer',
  'ComplianceScheme'
)

export const obligationsOrganisationSchema = Joi.object({
  id: guidSchema.required(),
  registrationType: obligationsRegistrationTypeSchema.required(),
  name: nullableString,
  complianceSchemeName: nullableString,
  schemeOperatorName: nullableString,
  referenceNumber: nullableString,
  address: obligationsAddressSchema.allow(null),
  regulator: Joi.string().required(),
  regulatorEmail: Joi.string().required()
}).unknown(true)

export const createComplianceDeclarationOrganisationSchema =
  obligationsOrganisationSchema.keys({
    registrationType: obligationsRegistrationTypeSchema.optional()
  })

export const localizedTextSchema = Joi.object({
  text: Joi.string().required(),
  language: Joi.string().required()
})

export const obligationsUserSchema = Joi.object({
  id: Joi.string().required(),
  email: Joi.string().required()
})

export const auditEntrySchema = Joi.object({
  user: obligationsUserSchema.required(),
  timestamp: Joi.string().required(),
  action: Joi.string().required(),
  reason: Joi.string()
}).unknown(true)

export const obligationYearSchema = Joi.number()
  .integer()
  .min(WASTE_API_YEAR_MIN)
  .max(WASTE_API_YEAR_MAX)

/** ComplianceDeclaration — required: id, organisation, obligationYear, obligationStatus, declarationText, submitterName */
export const complianceDeclarationSchema = Joi.object({
  id: mongoObjectIdSchema.required(),
  created: Joi.string(),
  updated: Joi.string(),
  status: complianceDeclarationStatusSchema,
  organisation: obligationsOrganisationSchema.required(),
  obligationYear: obligationYearSchema.required(),
  obligations: Joi.array().items(obligationSchema).default([]),
  obligationStatus: declarationObligationStatusSchema.required(),
  declarationText: localizedTextSchema.required(),
  submitterName: Joi.string().required(),
  isRegulation43Compliant: Joi.boolean(),
  audit: Joi.array().items(auditEntrySchema).default([])
}).unknown(true)

export const organisationComplianceDeclarationsResponseSchema = Joi.object({
  complianceDeclarations: Joi.array()
    .items(complianceDeclarationSchema)
    .default([])
}).unknown(true)

export const createComplianceDeclarationRequestSchema = Joi.object({
  organisation: createComplianceDeclarationOrganisationSchema.required(),
  obligationYear: obligationYearSchema.required(),
  obligations: Joi.array().items(obligationSchema).default([]),
  obligationStatus: declarationObligationStatusSchema.required(),
  declarationText: localizedTextSchema.required(),
  submitterName: Joi.string().required(),
  user: obligationsUserSchema.required(),
  isRegulation43Compliant: Joi.boolean()
})
