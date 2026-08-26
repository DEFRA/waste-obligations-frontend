import { config } from '#/config/config.js'

/**
 * Logs application errors without sending their potentially sensitive details
 * to deployed environments. Local development keeps the error for diagnosis.
 *
 * @param {{ error: Function, warn: Function }} logger
 * @param {'error' | 'warn'} level
 * @param {unknown} error
 * @param {string} message
 */
export function logApplicationError(logger, level, error, message) {
  if (config.get('isProduction')) {
    logger[level](message)
    return
  }

  logger[level]({ err: error }, message)
}
