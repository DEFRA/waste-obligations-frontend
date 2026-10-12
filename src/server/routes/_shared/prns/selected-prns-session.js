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

export function setSelectedPrnsListQueryInSession(
  request,
  userType,
  pathId,
  query = {}
) {
  const stored = {}

  for (const key of LIST_QUERY_KEYS) {
    const value = query[key]

    if (value !== undefined && value !== null && value !== '') {
      stored[key] = value
    }
  }

  request.yar.set(listQuerySessionKey(userType, pathId), stored)
}

export function getSelectedPrnsListQueryFromSession(request, userType, pathId) {
  const value = request.yar.get(listQuerySessionKey(userType, pathId))

  return value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}
}
