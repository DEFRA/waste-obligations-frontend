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

function acceptedAtSessionKey(userType, pathId) {
  return `acceptedPrnsAt:${userType}:${pathId}`
}

// How long the accepted PRNs stay on the confirmation. Long enough for the
// language switcher to reload it, short enough that a bookmark or back
// navigation later goes to the list rather than replaying an old result.
const ACCEPTED_PRNS_MAX_AGE_MS = 10 * 60 * 1000

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
  request.yar.set(acceptedAtSessionKey(userType, pathId), at.getTime())
}

// Reads the accepted PRNs without clearing them, so the confirmation survives a
// reload of the same page, such as the language switcher's ?lang= link. Once
// older than ACCEPTED_PRNS_MAX_AGE_MS they are cleared and nothing is returned,
// so a later visit goes to the list. They are also cleared when the PRNs list
// is opened, and replaced by the next bulk accept.
export function getAcceptedPrnsFromSession(
  request,
  userType,
  pathId,
  at = now()
) {
  const value = request.yar.get(acceptedSessionKey(userType, pathId))
  const acceptedAt = request.yar.get(acceptedAtSessionKey(userType, pathId))

  if (!Array.isArray(value)) {
    return []
  }

  const fresh =
    typeof acceptedAt === 'number' &&
    at.getTime() - acceptedAt <= ACCEPTED_PRNS_MAX_AGE_MS

  if (!fresh) {
    clearAcceptedPrnsFromSession(request, userType, pathId)

    return []
  }

  return value
}

export function clearAcceptedPrnsFromSession(request, userType, pathId) {
  request.yar.clear(acceptedSessionKey(userType, pathId))
  request.yar.clear(acceptedAtSessionKey(userType, pathId))
}
