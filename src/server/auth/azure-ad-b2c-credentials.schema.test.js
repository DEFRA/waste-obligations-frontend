import { describe, expect, test } from 'vitest'

import { AZURE_AD_B2C_AUTH_STRATEGY } from './azure-ad-b2c.js'
import {
  azureAdB2cCredentialsSchema,
  isIdTokenProfileValidationFailure,
  validateAzureAdB2cCredentials
} from './azure-ad-b2c-credentials.schema.js'

const validCredentials = {
  provider: AZURE_AD_B2C_AUTH_STRATEGY,
  query: {},
  refreshToken: 'refresh-token',
  profile: {
    exp: 1780920241,
    nbf: 1780916641,
    ver: '1.0',
    iss: 'https://azdcuspoc2.b2clogin.com/8a3f509a-c892-4bec-bfe9-d5f5cf251813/v2.0/',
    sub: '79d0deab-c22d-4c30-8082-508ff8dc1bd7',
    aud: '1a512714-ecd4-44f1-ad60-8229da59fb52',
    acr: 'b2c_1a_epr_signupsignin',
    iat: 1780916641,
    auth_time: 1780916640,
    oid: '79d0deab-c22d-4c30-8082-508ff8dc1bd7',
    email: 'test+directproducer@ee.com'
  }
}

describe('azureAdB2cCredentialsSchema', () => {
  test('accepts Bell Azure AD B2C credentials', () => {
    const { error, value } = validateAzureAdB2cCredentials(validCredentials)

    expect(error).toBeUndefined()
    expect(value).toEqual(validCredentials)
  })

  test('accepts credentials with access token instead of refresh token', () => {
    const { error, value } = validateAzureAdB2cCredentials({
      provider: AZURE_AD_B2C_AUTH_STRATEGY,
      token: 'access-token',
      profile: { sub: 'user-1' }
    })

    expect(error).toBeUndefined()
    expect(value.profile.sub).toBe('user-1')
  })

  test('rejects credentials without provider', () => {
    const { error } = validateAzureAdB2cCredentials({
      token: 'access-token',
      profile: { sub: 'user-1' }
    })

    expect(error?.details.map((detail) => detail.message)).toEqual([
      '"provider" is required'
    ])
    expect(isIdTokenProfileValidationFailure(error)).toBe(false)
  })

  test('rejects credentials with invalid provider', () => {
    const { error } = validateAzureAdB2cCredentials({
      provider: 'other-provider',
      profile: { sub: 'user-1' }
    })

    expect(error?.details.map((detail) => detail.message)).toEqual([
      `"provider" must be [${AZURE_AD_B2C_AUTH_STRATEGY}]`
    ])
  })

  test('rejects credentials without sub or oid in profile', () => {
    const { error } = validateAzureAdB2cCredentials({
      provider: AZURE_AD_B2C_AUTH_STRATEGY,
      profile: {}
    })

    expect(error?.details.map((detail) => detail.message)).toEqual([
      '"profile" must contain at least one of [sub, oid]'
    ])
    expect(isIdTokenProfileValidationFailure(error)).toBe(true)
  })

  test('rejects missing credentials', () => {
    const { error } = validateAzureAdB2cCredentials(undefined)

    expect(error?.details.map((detail) => detail.message)).toEqual([
      '"value" is required'
    ])
  })

  test('exports schema for reuse', () => {
    expect(azureAdB2cCredentialsSchema).toBeDefined()
  })
})
