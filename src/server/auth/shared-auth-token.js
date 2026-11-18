import { createHmac, timingSafeEqual } from 'node:crypto'

// A standard HS256 JSON Web Token, so a frontend on any stack can check it
// with an ordinary JWT library. Proof of concept: a real implementation would
// use a maintained JWT library.

const HEADER = { alg: 'HS256', typ: 'JWT' }

function base64Url(value) {
  return Buffer.from(value).toString('base64url')
}

function signature(input, secret) {
  return createHmac('sha256', secret).update(input).digest('base64url')
}

/**
 * @param {{ sub: string }} claims
 * @param {{ secret: string, issuer: string, ttl: number, now?: number }} options
 * @returns {string}
 */
export function signSharedAuthToken(claims, { secret, issuer, ttl, now }) {
  const issuedAt = Math.floor((now ?? Date.now()) / 1000)
  const payload = {
    sub: claims.sub,
    iss: issuer,
    aud: issuer,
    iat: issuedAt,
    exp: issuedAt + Math.floor(ttl / 1000)
  }
  const input = `${base64Url(JSON.stringify(HEADER))}.${base64Url(JSON.stringify(payload))}`

  return `${input}.${signature(input, secret)}`
}

/**
 * @param {unknown} token
 * @param {{ secret: string, issuer: string, now?: number }} options
 * @returns {{ sub: string, exp: number } | null} the claims, or null when the
 *   token is missing, malformed, wrongly signed, for another audience or expired
 */
export function verifySharedAuthToken(token, { secret, issuer, now }) {
  if (typeof token !== 'string' || !secret) {
    return null
  }

  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }

  const [header, payload, sig] = parts
  const expected = Buffer.from(signature(`${header}.${payload}`, secret))
  const actual = Buffer.from(sig)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null
  }

  try {
    const { alg } = JSON.parse(Buffer.from(header, 'base64url').toString())
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
    const nowSeconds = Math.floor((now ?? Date.now()) / 1000)

    if (
      alg !== 'HS256' ||
      claims.iss !== issuer ||
      claims.aud !== issuer ||
      typeof claims.sub !== 'string' ||
      !claims.sub ||
      typeof claims.exp !== 'number' ||
      claims.exp <= nowSeconds
    ) {
      return null
    }

    return claims
  } catch {
    return null
  }
}
