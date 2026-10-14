/**
 * Session storage for the PRNs/PERNs a user has multi-selected on the
 * awaiting-acceptance list, carried to the check-selection page. Also stores:
 *
 * - the full PRN data for the selection, as returned by the list request
 *   that made it, so the check-selection page can render straight from the
 *   session instead of re-fetching each selected PRN from the backend.
 * - the list's own sort/filter/page query from the moment of selection, so
 *   "Go back" from the check-selection page returns to the same list view
 *   rather than a reset one.
 *
 * Keyed by user type and path id so a selection made for one organisation or
 * scheme is never shown against another.
 */

import { now } from '#/server/common/helpers/clock.js'
import { resolveAvailableAcceptanceYears } from './available-acceptance-years.js'

const LIST_QUERY_KEYS = ['year', 'sort', 'material', 'page', 'pageSize']

function sessionKey(userType, pathId) {
  return `selectedPrnIds:${userType}:${pathId}`
}

function dataSessionKey(userType, pathId) {
  return `selectedPrnsData:${userType}:${pathId}`
}

function listQuerySessionKey(userType, pathId) {
  return `selectedPrnsListQuery:${userType}:${pathId}`
}

function acceptedSessionKey(userType, pathId) {
  return `acceptedPrns:${userType}:${pathId}`
}

export function getSelectedPrnIdsFromSession(request, userType, pathId) {
  const value = request.yar.get(sessionKey(userType, pathId))

  return Array.isArray(value) ? value : []
}

export function setSelectedPrnIdsInSession(request, userType, pathId, prnIds) {
  const key = sessionKey(userType, pathId)

  if (prnIds.length === 0) {
    request.yar.clear(key)
    return
  }

  request.yar.set(key, [...new Set(prnIds)])
}

export function removeSelectedPrnIdFromSession(
  request,
  userType,
  pathId,
  prnId
) {
  const remaining = getSelectedPrnIdsFromSession(
    request,
    userType,
    pathId
  ).filter((id) => id !== prnId)

  setSelectedPrnIdsInSession(request, userType, pathId, remaining)
}

export function setSelectedPrnsDataInSession(request, userType, pathId, prns) {
  const key = dataSessionKey(userType, pathId)

  if (prns.length === 0) {
    request.yar.clear(key)
    return
  }

  request.yar.set(key, prns)
}

export function getSelectedPrnsDataFromSession(request, userType, pathId) {
  const value = request.yar.get(dataSessionKey(userType, pathId))

  return Array.isArray(value) ? value : []
}

// The PRNs list's own sort/filter/page query: only the known keys, without
// undefined, null or empty values.
export function pickListQuery(query = {}) {
  const picked = {}

  for (const key of LIST_QUERY_KEYS) {
    const value = query[key]

    if (value !== undefined && value !== null && value !== '') {
      picked[key] = value
    }
  }

  return picked
}

export function setSelectedPrnsListQueryInSession(
  request,
  userType,
  pathId,
  query = {}
) {
  request.yar.set(listQuerySessionKey(userType, pathId), pickListQuery(query))
}

export function getSelectedPrnsListQueryFromSession(request, userType, pathId) {
  const value = request.yar.get(listQuerySessionKey(userType, pathId))

  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}

// Clears the whole selection: ids, cached PRN data and the list query. Call it
// once the selection is finished with, after any redirect that needs the list
// query has been built.
export function clearSelectedPrnsFromSession(request, userType, pathId) {
  request.yar.clear(sessionKey(userType, pathId))
  request.yar.clear(dataSessionKey(userType, pathId))
  request.yar.clear(listQuerySessionKey(userType, pathId))
}

// The PRNs just accepted in bulk, shown on the accepted-selection
// confirmation page. Only what that page needs is kept: the material and
// tonnage it totals per material, and the year each PRN was accepted into.
// That is its single available acceptance year (only single-year PRNs can be
// multi-selected), not its raw obligationYear: December waste can be accepted
// into the following year. `at` is the accept's clock reading (see clock.js),
// so this is the same year that was sent to the API.
export function setAcceptedPrnsInSession(
  request,
  userType,
  pathId,
  prns,
  at = now()
) {
  request.yar.set(
    acceptedSessionKey(userType, pathId),
    prns.map((prn) => ({
      material: prn.material,
      tonnage: prn.tonnage,
      acceptanceYear: resolveAvailableAcceptanceYears(prn, { now: at })[0]
    }))
  )
}

// Reads the accepted PRNs without clearing them, so the confirmation survives a
// reload of the same page, such as the language switcher's ?lang= link. They
// are cleared when the PRNs list is opened again, and replaced by the next
// bulk accept.
export function getAcceptedPrnsFromSession(request, userType, pathId) {
  const value = request.yar.get(acceptedSessionKey(userType, pathId))

  return Array.isArray(value) ? value : []
}

export function clearAcceptedPrnsFromSession(request, userType, pathId) {
  request.yar.clear(acceptedSessionKey(userType, pathId))
}
