import { config } from '#/config/config.js'

/**
 * Whether the CSoC obligations tables show a dash, not 0, for a material with no
 * data yet. It follows the Manage Obligations feature, so the CSoC pages look
 * like the Manage Obligations page once that feature is on.
 *
 * @returns {boolean}
 */
export function dashWhenNoDataYet() {
  return config.get('features.manageObligations')
}
