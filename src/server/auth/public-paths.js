import { paths } from '#/config/paths.js'
import { config } from '#/config/config.js'

const OPEN_PATHS = new Set([
  paths.health,
  paths.signInOidc,
  paths.signOut,
  paths.clearSession,
  paths.signedOut,
  '/favicon.ico'
])

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isPublicPath(path) {
  if (OPEN_PATHS.has(path)) {
    return true
  }

  const assetPath = config.get('assetPath')
  if (path === assetPath || path.startsWith(`${assetPath}/`)) {
    return true
  }

  return false
}
