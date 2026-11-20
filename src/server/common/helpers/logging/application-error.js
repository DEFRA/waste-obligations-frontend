import { config } from '#/config/config.js'

const loggedErrors = new WeakSet()

/**
 * Whether this error object has already been logged at error level by logApplicationError, so
 * a later catch-all can avoid logging the same failure a second time.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
export function wasApplicationErrorLogged(error) {
  return typeof error === 'object' && error !== null && loggedErrors.has(error)
}

/**
 * Logs application errors without sending their potentially sensitive details
 * to deployed environments. Local development keeps the error for diagnosis.
 *
 * @param {{ error: Function, warn: Function }} logger
 * @param {'error' | 'warn'} level
 * @param {unknown} error
 * @param {string} message
 * @param {Record<string, unknown>} [safeContext] structured fields that are
 *   safe to log in deployed environments (no message text or personal data)
 */
export function logApplicationError(
  logger,
  level,
  error,
  message,
  safeContext
) {
  if (level === 'error' && typeof error === 'object' && error !== null) {
    loggedErrors.add(error)
  }

  if (config.get('isProduction')) {
    if (safeContext) {
      logger[level](safeContext, message)
    } else {
      logger[level](message)
    }
    return
  }

  logger[level]({ err: error }, message)
}
