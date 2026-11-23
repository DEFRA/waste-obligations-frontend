import { config } from '#/config/config.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'

import {
  csoObligationsHomePath,
  producerObligationsHomePath
} from './obligations-paths.js'

/**
 * Where a "back to your recycling obligations" link goes: this service's
 * Manage Obligations page for the year when that page is on, otherwise the
 * packaging service's page (an absolute URL, so not prefixed).
 *
 * @param {object} request
 * @param {object} options
 * @param {'producer' | 'cso'} options.userType
 * @param {string} options.id  The organisation id (producer) or scheme id (cso).
 * @param {number | string} [options.year]
 * @returns {string}
 */
export function manageObligationsHref(request, { userType, id, year }) {
  if (!config.get('features.manageObligations')) {
    return config.get('eprPackaging.manageYourRecyclingObligationsUrl')
  }

  const path =
    userType === 'cso'
      ? csoObligationsHomePath(id, year)
      : producerObligationsHomePath(id, year)

  return withForwardedPrefix(request, path)
}
