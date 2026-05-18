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
 * @param {object} credentials
 */
export function setUserFromCredentials(request, credentials) {
  request.yar.set('user', credentials)
}
