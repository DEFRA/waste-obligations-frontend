/* v8 ignore start */
export const paths = {
  home: '/',
  cookies: '/cookies',
  signInOidc: '/signin-oidc',
  signOut: '/sign-out',
  clearSession: '/clear-session',
  signedOut: '/signed-out',
  health: '/health'
}
/* v8 ignore stop */

/**
 * @param {string} returnPath
 * @returns {boolean}
 */
export function isSafeReturnPath(returnPath) {
  if (!returnPath || typeof returnPath !== 'string') {
    return false
  }

  if (!returnPath.startsWith('/') || returnPath.startsWith('//')) {
    return false
  }

  return !returnPath.includes('://')
}
