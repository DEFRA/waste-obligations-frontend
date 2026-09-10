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

export const obligationsUserSchema = Joi.object({
  id: Joi.string().required(),
  email: Joi.string().required(),
  name: Joi.string().required(),
  locale: Joi.string().valid('en', 'cy').allow(null)
})

export const createUpdateObligationsUserSchema = obligationsUserSchema.keys({
  locale: Joi.string().valid('en', 'cy').required()
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

export const complianceDeclarationSchema = Joi.object({
  id: mongoObjectIdSchema.required(),
  created: Joi.string(),
  updated: Joi.string(),
  status: complianceDeclarationStatusSchema,
  organisation: obligationsOrganisationSchema.required(),
  obligationYear: obligationYearSchema.required(),
  obligations: Joi.array().items(obligationSchema).default([]),
  obligationStatus: declarationObligationStatusSchema.required(),
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
  organisation: obligationsOrganisationSchema.required(),
  obligationYear: obligationYearSchema.required(),
  obligations: Joi.array().items(obligationSchema).default([]),
  obligationStatus: declarationObligationStatusSchema.required(),
  submitterName: Joi.string().required(),
  user: createUpdateObligationsUserSchema.required(),
  isRegulation43Compliant: Joi.boolean()
})

/**
 * The lifecycle states a PRN/PERN can be in. Single source of truth for the
 * status strings — consumed by `prnStatusSchema`, the status-editability rule
 * (`_shared/prn-status.js`) and the list/detail view models.
 */
export const PRN_STATUS = Object.freeze({
  AWAITING_ACCEPTANCE: 'AwaitingAcceptance',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled'
})

export const PRN_STATUSES = Object.freeze(Object.values(PRN_STATUS))

export const prnStatusSchema = Joi.string().valid(...PRN_STATUSES)

export const prnTypeSchema = Joi.string().valid('PRN', 'PERN')

export const updatePrnStatusSchema = Joi.string().valid('ACCEPTED', 'REJECTED')

export const updatePrnStatusRequestSchema = Joi.object({
  status: updatePrnStatusSchema.required(),
  user: createUpdateObligationsUserSchema.required()
})

const prnIssuerSchema = Joi.object({
  organisationName: nullableString
}).unknown(true)

const prnRecipientSchema = Joi.object({
  organisationId: guidSchema,
  displayName: nullableString,
  name: nullableString,
  tradingName: nullableString,
  registrationType: nullableString
}).unknown(true)

const prnAuthorisedBySchema = Joi.object({
  name: nullableString,
  position: nullableString
}).unknown(true)

const prnAuditSchema = Joi.object({
  createdAt: Joi.string(),
  updatedAt: Joi.string(),
  acceptedAt: nullableString,
  rejectedAt: nullableString,
  cancelledAt: nullableString
}).unknown(true)

export const prnSchema = Joi.object({
  id: guidSchema.required(),
  number: Joi.string().required(),
  type: prnTypeSchema,
  status: prnStatusSchema,
  issuedAt: Joi.string(),
  obligationYear: obligationYearSchema,
  accreditationYear: Joi.number().integer(),
  decemberWaste: Joi.boolean(),
  material: Joi.string(),
  recyclingProcess: nullableString,
  tonnage: nonNegativeInteger,
  issuer: prnIssuerSchema,
  recipient: prnRecipientSchema,
  authorisedBy: prnAuthorisedBySchema,
  accreditationNumber: nullableString,
  reprocessingSite: nullableString,
  reprocessorExporterAgency: nullableString,
  additionalNotes: nullableString,
  audit: prnAuditSchema
}).unknown(true)

export const prnSortSchema = Joi.string().valid(
  'IssuedAtDescending',
  'IssuedAtAscending',
  'TonnageDescending',
  'TonnageAscending',
  'IssuerDescending',
  'IssuerAscending',
  'DecemberWasteDescending',
  'MaterialDescending',
  'MaterialAscending'
)

export const organisationPrnsResponseSchema = Joi.object({
  prns: Joi.array().items(prnSchema).default([]),
  total: Joi.number().integer().min(0).required(),
  page: Joi.number().integer().min(1).required(),
  pageSize: Joi.number().integer().min(1).required()
}).unknown(true)
