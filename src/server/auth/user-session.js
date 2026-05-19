import Boom from '@hapi/boom'

/**
 * @param {import('@hapi/hapi').Request} request
 * @returns {object | null}
 */
export function getUserFromRequest(request) {
  return request.yar?.get('user') ?? null
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @returns {string | null}
 */
export function getUserIdFromRequest(request) {
  const profile = getUserFromRequest(request)?.profile
  if (!profile) {
    return null
  }

  return profile.sub || profile.oid || null
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @returns {string | null}
 */
export function getUserEmailFromRequest(request) {
  const profile = getUserFromRequest(request)?.profile
  if (!profile) {
    return null
  }

  return (
    profile.email || profile.emails?.[0] || profile.preferred_username || null
  )
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @returns {{ id: string, email: string }}
 */
export function getSubmitterFromRequest(request) {
  const id = getUserIdFromRequest(request)
  if (!id) {
    throw Boom.unauthorized('You must be signed in to continue')
  }

  const email = getUserEmailFromRequest(request)
  if (!email) {
    throw Boom.badRequest('A signed-in user email address is required')
  }

  return {
    id,
    email
  }
}

/**
 * @param {string} userId
 * @param {string} organisationId
 * @param {string | number} year
 * @returns {string}
 */
export function buildCertificateSubmitCacheKey(userId, organisationId, year) {
  return `compliance-certificate-submit:${userId}:${organisationId}:${year}`
}

/**
 * @param {import('@hapi/hapi').Request} request
 * @param {object} credentials
 */
export function setUserFromCredentials(request, credentials) {
  request.yar.set('user', credentials)
}
