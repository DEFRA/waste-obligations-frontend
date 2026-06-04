import Joi from 'joi'

import { WASTE_API_YEAR_MAX, WASTE_API_YEAR_MIN } from '#/config/constants.js'
import { guidSchema, nullableString } from '#/server/services/schemas/common.js'

export const businessCountrySchema = Joi.string().valid(
  'GB-ENG',
  'GB-NIR',
  'GB-SCT',
  'GB-WLS'
)

export const organisationAddressSchema = Joi.object({
  addressLine1: nullableString,
  addressLine2: nullableString,
  town: nullableString,
  county: nullableString,
  postcode: nullableString,
  country: nullableString
})

export const registrationStatusSchema = Joi.string().valid(
  'REGISTERED',
  'CANCELLED'
)

export const registrationTypeSchema = Joi.string().valid(
  'SMALL_PRODUCER',
  'LARGE_PRODUCER',
  'COMPLIANCE_SCHEME',
  'REPROCESSOR',
  'EXPORTER'
)

export const registrationYearSchema = Joi.number()
  .integer()
  .min(WASTE_API_YEAR_MIN)
  .max(WASTE_API_YEAR_MAX)

export const organisationRegistrationSchema = Joi.object({
  status: registrationStatusSchema.required(),
  type: registrationTypeSchema.required(),
  registrationYear: registrationYearSchema.required(),
  created: Joi.string().required(),
  updated: Joi.string().required()
}).unknown(true)

export const wasteOrganisationSchema = Joi.object({
  id: guidSchema.required(),
  name: Joi.string().required(),
  tradingName: nullableString,
  businessCountry: businessCountrySchema.allow(null),
  companiesHouseNumber: nullableString,
  address: organisationAddressSchema.required(),
  registrations: Joi.array().items(organisationRegistrationSchema).default([])
}).unknown(true)

export const registrationSchema = Joi.object({
  status: registrationStatusSchema.required(),
  type: registrationTypeSchema.required(),
  registrationYear: registrationYearSchema.required()
}).unknown(true)

export const organisationRegistrationUpsertRequestSchema = Joi.object({
  name: Joi.string().required(),
  tradingName: nullableString,
  businessCountry: businessCountrySchema.allow(null),
  companiesHouseNumber: nullableString,
  address: organisationAddressSchema.required(),
  registration: registrationSchema.required()
}).unknown(true)

export const registrationUpsertRequestSchema = Joi.object({
  status: registrationStatusSchema.required()
}).unknown(true)

export const organisationSearchResponseSchema = Joi.object({
  organisations: Joi.array().items(wasteOrganisationSchema).default([])
}).unknown(true)
