import { createHmac, timingSafeEqual } from 'node:crypto'

// A standard HS256 JSON Web Token, so a frontend on any stack can check it
// with an ordinary JWT library. Proof of concept: a real implementation would
// use a maintained JWT library.

const HEADER = { alg: 'HS256', typ: 'JWT' }

// header.payload.signature
const JWT_PARTS = 3

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

function decode(part) {
  return JSON.parse(Buffer.from(part, 'base64url').toString())
}

function hasValidSignature([header, payload, sig], secret) {
  const expected = Buffer.from(signature(`${header}.${payload}`, secret))
  const actual = Buffer.from(sig)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function isForThisIssuer(claims, issuer) {
  return claims.iss === issuer && claims.aud === issuer
}

function isLive(claims, nowSeconds) {
  return (
    typeof claims.sub === 'string' &&
    claims.sub !== '' &&
    typeof claims.exp === 'number' &&
    claims.exp > nowSeconds
  )
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
  if (parts.length !== JWT_PARTS || !hasValidSignature(parts, secret)) {
    return null
  }

  try {
    const { alg } = decode(parts[0])
    const claims = decode(parts[1])
    const nowSeconds = Math.floor((now ?? Date.now()) / 1000)
    const valid =
      alg === HEADER.alg &&
      isForThisIssuer(claims, issuer) &&
      isLive(claims, nowSeconds)

    return valid ? claims : null
  } catch {
    return null
  }
}
