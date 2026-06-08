import Joi from 'joi'

import { AZURE_AD_B2C_AUTH_STRATEGY } from './azure-ad-b2c.js'

export const idTokenProfileSchema = Joi.object({
  sub: Joi.string().optional(),
  oid: Joi.string().optional()
})
  .or('sub', 'oid')
  .unknown(true)
  .required()

export const azureAdB2cCredentialsSchema = Joi.object({
  provider: Joi.string().valid(AZURE_AD_B2C_AUTH_STRATEGY).required(),
  query: Joi.object().unknown(true).default({}),
  token: Joi.string().optional(),
  refreshToken: Joi.string().optional(),
  profile: idTokenProfileSchema
})
  .unknown(true)
  .required()

export function validateAzureAdB2cCredentials(credentials) {
  return azureAdB2cCredentialsSchema.validate(credentials, {
    abortEarly: false,
    convert: true
  })
}

export function isIdTokenProfileValidationFailure(error) {
  return error.details.some((detail) => detail.path[0] === 'profile')
}
