import Joi from 'joi'

import { guidSchema } from '#/server/services/schemas/common.js'

const nullableString = Joi.string().allow(null, '')

export const accountOrganisationSchema = Joi.object({
  id: guidSchema.required(),
  name: Joi.string().required(),
  organisationNumber: Joi.string().required(),
  tradingName: nullableString,
  organisationRole: nullableString,
  organisationType: nullableString,
  companiesHouseNumber: nullableString,
  producerType: Joi.any().allow(null),
  nationId: Joi.number().allow(null),
  organisationAddress: Joi.any().allow(null),
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
  joinerDate: Joi.any().allow(null),
  leaverCode: Joi.any().allow(null),
  leaverDate: Joi.any().allow(null),
  organisationChangeReason: Joi.any().allow(null),
  personRoleInOrganisation: Joi.any().allow(null),
  isChangeRequestPending: Joi.boolean(),
  enrolments: Joi.any().allow(null)
}).unknown(true)

export const accountUserSchema = Joi.object({
  id: guidSchema.required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  roleInOrganisation: Joi.string().required(),
  enrolmentStatus: Joi.string().required(),
  serviceRole: Joi.string().required(),
  service: Joi.string().required(),
  serviceRoleId: Joi.number().required(),
  telephone: nullableString,
  jobTitle: nullableString,
  isChangeRequestPending: Joi.boolean().required(),
  numberOfOrganisations: Joi.number().required(),
  organisations: Joi.array().items(accountOrganisationSchema).default([])
}).unknown(true)

export const userOrganisationsResponseSchema = Joi.object({
  user: accountUserSchema.required()
})
