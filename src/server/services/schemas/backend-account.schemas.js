/**
 * Joi schemas aligned with Backend Account Service OpenAPI v1.0
 */
import Joi from 'joi'

import { guidSchema, nullableString } from '#/server/services/schemas/common.js'

export const enrolmentModelSchema = Joi.object({
  enrolmentId: Joi.number().integer().allow(null),
  enrolmentStatus: nullableString,
  serviceRole: nullableString,
  serviceRoleKey: nullableString,
  service: nullableString,
  serviceKey: nullableString,
  serviceRoleId: Joi.number().integer().allow(null)
})

export const accountOrganisationSchema = Joi.object({
  id: guidSchema.required(),
  name: nullableString,
  tradingName: nullableString,
  organisationRole: nullableString,
  organisationType: nullableString,
  organisationNumber: nullableString,
  companiesHouseNumber: nullableString,
  producerType: nullableString,
  nationId: Joi.number().integer().allow(null),
  organisationAddress: nullableString,
  jobTitle: nullableString,
  subBuildingName: nullableString,
  buildingName: nullableString,
  buildingNumber: nullableString,
  street: nullableString,
  locality: nullableString,
  dependentLocality: nullableString,
  town: nullableString,
  county: nullableString,
  country: nullableString,
  postcode: nullableString,
  joinerDate: nullableString,
  leaverCode: nullableString,
  leaverDate: nullableString,
  organisationChangeReason: nullableString,
  personRoleInOrganisation: nullableString,
  isChangeRequestPending: Joi.boolean(),
  enrolments: Joi.array().items(enrolmentModelSchema).allow(null)
}).unknown(true)

export const accountUserSchema = Joi.object({
  id: guidSchema.allow(null),
  firstName: nullableString,
  lastName: nullableString,
  email: nullableString,
  roleInOrganisation: nullableString,
  enrolmentStatus: nullableString,
  serviceRole: nullableString,
  service: nullableString,
  serviceRoleId: Joi.number().integer().default(0),
  telephone: nullableString,
  jobTitle: nullableString,
  isChangeRequestPending: Joi.boolean().default(false),
  numberOfOrganisations: Joi.number().integer().default(0),
  organisations: Joi.array()
    .items(accountOrganisationSchema)
    .allow(null)
    .default([])
}).unknown(true)

export const operatorComplianceSchemeSchema = Joi.object({
  id: guidSchema.required(),
  name: nullableString,
  rowNumber: Joi.number().integer().allow(null),
  createdOn: nullableString,
  nationId: Joi.number().integer().allow(null)
}).unknown(true)

export const operatorComplianceSchemesResponseSchema = Joi.array()
  .items(operatorComplianceSchemeSchema)
  .default([])

export const userOrganisationsResponseSchema = Joi.object({
  user: accountUserSchema
})
