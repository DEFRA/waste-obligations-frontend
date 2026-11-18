import { describe, expect, test } from 'vitest'

import {
  signSharedAuthToken,
  verifySharedAuthToken
} from './shared-auth-token.js'

const options = { secret: 'a-shared-secret', issuer: 'epr-cdp-frontends' }
const now = Date.UTC(2026, 10, 18, 12)

function token(overrides = {}) {
  return signSharedAuthToken(
    { sub: 'user-1' },
    { ...options, ttl: 60_000, now, ...overrides }
  )
}

describe('shared sign-in token', () => {
  test('is a JWT another frontend with the same key accepts', () => {
    const value = token()

    expect(value.split('.')).toHaveLength(3)
    expect(verifySharedAuthToken(value, { ...options, now })).toMatchObject({
      sub: 'user-1',
      iss: 'epr-cdp-frontends',
      aud: 'epr-cdp-frontends'
    })
  })

  test('is refused when signed with another key', () => {
    expect(
      verifySharedAuthToken(token({ secret: 'another' }), { ...options, now })
    ).toBeNull()
  })

  test('is refused once it has expired', () => {
    expect(
      verifySharedAuthToken(token(), { ...options, now: now + 60_000 })
    ).toBeNull()
  })

  test('is refused when its claims were changed', () => {
    const [header, , sig] = token().split('.')
    const forged = Buffer.from(
      JSON.stringify({
        sub: 'user-2',
        iss: options.issuer,
        aud: options.issuer,
        exp: 9e9
      })
    ).toString('base64url')

    expect(
      verifySharedAuthToken(`${header}.${forged}.${sig}`, { ...options, now })
    ).toBeNull()
  })

  test.each([undefined, '', 'not-a-token', 'a.b'])(
    'is refused when it is %s',
    (value) => {
      expect(verifySharedAuthToken(value, { ...options, now })).toBeNull()
    }
  )

  test('is refused when no key is configured', () => {
    expect(
      verifySharedAuthToken(token(), { ...options, secret: '', now })
    ).toBeNull()
  })
})
