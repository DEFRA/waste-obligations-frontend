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
