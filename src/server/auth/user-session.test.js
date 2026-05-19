import { TEST_AUTH_USER_EMAIL, TEST_AUTH_USER_ID } from './constants.js'
import {
  buildCertificateSubmitCacheKey,
  getSubmitterFromRequest,
  getUserEmailFromRequest,
  getUserFromRequest,
  getUserIdFromRequest,
  setUserFromCredentials
} from './user-session.js'

function createRequest(user) {
  const store = new Map()
  if (user !== undefined) {
    store.set('user', user)
  }

  return {
    yar: {
      get: (key) => store.get(key),
      set: (key, value) => store.set(key, value)
    }
  }
}

describe('user-session', () => {
  describe('getUserFromRequest', () => {
    test('returns null when yar has no user', () => {
      expect(getUserFromRequest(createRequest())).toBeNull()
    })

    test('returns null when yar is missing', () => {
      expect(getUserFromRequest({})).toBeNull()
    })

    test('returns stored user credentials', () => {
      const user = { token: 'access', profile: { sub: 'user-1' } }
      expect(getUserFromRequest(createRequest(user))).toEqual(user)
    })
  })

  describe('getUserIdFromRequest', () => {
    test('returns null when there is no user', () => {
      expect(getUserIdFromRequest(createRequest())).toBeNull()
    })

    test('returns null when profile is missing', () => {
      expect(
        getUserIdFromRequest(createRequest({ token: 'access' }))
      ).toBeNull()
    })

    test('prefers profile.sub over profile.oid', () => {
      const request = createRequest({
        profile: { sub: 'sub-id', oid: 'oid-id' }
      })

      expect(getUserIdFromRequest(request)).toBe('sub-id')
    })

    test('falls back to profile.oid when sub is absent', () => {
      const request = createRequest({
        profile: { oid: 'oid-id' }
      })

      expect(getUserIdFromRequest(request)).toBe('oid-id')
    })
  })

  describe('getUserEmailFromRequest', () => {
    test('returns null when there is no user', () => {
      expect(getUserEmailFromRequest(createRequest())).toBeNull()
    })

    test('reads email from profile', () => {
      expect(
        getUserEmailFromRequest(
          createRequest({
            profile: { email: 'user@example.com' }
          })
        )
      ).toBe('user@example.com')
    })
  })

  describe('getSubmitterFromRequest', () => {
    test('returns id and email', () => {
      expect(
        getSubmitterFromRequest(
          createRequest({
            profile: {
              sub: TEST_AUTH_USER_ID,
              email: TEST_AUTH_USER_EMAIL
            }
          })
        )
      ).toEqual({
        id: TEST_AUTH_USER_ID,
        email: TEST_AUTH_USER_EMAIL
      })
    })
  })

  describe('buildCertificateSubmitCacheKey', () => {
    test('scopes cache to the signed-in user', () => {
      expect(buildCertificateSubmitCacheKey('user-1', 'org-1', 2026)).toBe(
        'compliance-certificate-submit:user-1:org-1:2026'
      )
    })
  })

  describe('setUserFromCredentials', () => {
    test('stores credentials on yar', () => {
      const request = createRequest()
      const credentials = {
        token: 'access',
        profile: { sub: 'user-1', email: 'user@example.com' }
      }

      setUserFromCredentials(request, credentials)

      expect(getUserFromRequest(request)).toEqual(credentials)
    })
  })
})
