import { describe, expect, test } from 'vitest'

import {
  EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
  EPR_PACKAGING_BASIC_USER_SERVICE_ROLE,
  EPR_PACKAGING_DELEGATED_PERSON_SERVICE_ROLE
} from '#/server/auth/constants.js'
import { isApprovedOrDelegatedUser } from './user-permissions.js'

describe('isApprovedOrDelegatedUser', () => {
  test('returns true for approved person', () => {
    expect(
      isApprovedOrDelegatedUser({
        serviceRole: EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE
      })
    ).toBe(true)
  })

  test('returns true for delegated person', () => {
    expect(
      isApprovedOrDelegatedUser({
        serviceRole: EPR_PACKAGING_DELEGATED_PERSON_SERVICE_ROLE
      })
    ).toBe(true)
  })

  test('returns false for basic user', () => {
    expect(
      isApprovedOrDelegatedUser({
        serviceRole: EPR_PACKAGING_BASIC_USER_SERVICE_ROLE
      })
    ).toBe(false)
  })

  test('returns false when service role is missing', () => {
    expect(isApprovedOrDelegatedUser({})).toBe(false)
    expect(isApprovedOrDelegatedUser(null)).toBe(false)
  })
})
