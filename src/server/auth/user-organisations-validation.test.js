import { describe, expect, test } from 'vitest'

import { EPR_PACKAGING_SERVICE_NAME } from '#/server/auth/account-service-constants.js'
import { isEligibleForObligationsLogin } from '#/server/auth/user-organisations-validation.js'

describe('isEligibleForObligationsLogin', () => {
  test('returns false when user organisations is null', () => {
    expect(isEligibleForObligationsLogin(null)).toBe(false)
  })

  test('returns false when user is missing', () => {
    expect(isEligibleForObligationsLogin({})).toBe(false)
  })

  test('returns false when service is not EPR Packaging', () => {
    expect(
      isEligibleForObligationsLogin({
        user: { service: 'Other Service' }
      })
    ).toBe(false)
  })

  test('returns true when service is EPR Packaging', () => {
    expect(
      isEligibleForObligationsLogin({
        user: { service: EPR_PACKAGING_SERVICE_NAME }
      })
    ).toBe(true)
  })
})
