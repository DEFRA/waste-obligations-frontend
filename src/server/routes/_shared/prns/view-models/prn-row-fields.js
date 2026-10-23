import { formatDate } from '#/config/nunjucks/filters/format-date.js'
import {
  csoPrnPath,
  producerPrnPath
} from '#/server/routes/_shared/prns/prns-paths.js'

/**
 * Field readers and the detail-page path shared by the PRNs list and
 * check-selection view models, so both build these fields from a PRN the
 * same way.
 */

export function prnDetailPath(userType, pathId, prnId, year) {
  return userType === 'cso'
    ? csoPrnPath(pathId, prnId, year)
    : producerPrnPath(pathId, prnId, year)
}

export function formatPrnIssuedAt(prn) {
  return prn.issuedAt ? formatDate(prn.issuedAt, 'dd MMM yyyy') : ''
}

export function prnIssuerName(prn) {
  return prn.issuer?.organisationName ?? ''
}

export function prnTonnage(prn) {
  return prn.tonnage ?? 0
}

// Adding decimal tonnages in binary floats leaves error (0.1 + 0.2 is
// 0.30000000000000004). Rounding to three places, a kilogram, removes it.
export function roundTonnage(value) {
  return Math.round(value * 1000) / 1000
}

const tonnageFormat = new Intl.NumberFormat('en-GB', {
  maximumFractionDigits: 3
})

// A tonnage for display: thousands separators, at most three decimal places.
export function formatTonnage(value) {
  return tonnageFormat.format(value)
}
