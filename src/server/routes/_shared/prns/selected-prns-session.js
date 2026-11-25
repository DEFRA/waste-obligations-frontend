/**
 * Session storage for the PRNs/PERNs a user has multi-selected on the
 * awaiting-acceptance list. The session is where the selection lives: the list
 * shows it ticked whenever it is opened, each list page's ticks are saved as they
 * are made (the list's selection route in prns-list-routes.js), and the check-selection page reviews it. It is
 * emptied once a PRN is accepted or rejected (in bulk or on its own page) or
 * the list is opened for another year, and a material filter keeps only the
 * selected PRNs it lists.
 * Also stores:
 *
 * - the full PRN data for the selection, as returned by the list request
 *   that made it, so the check-selection page can render straight from the
 *   session instead of re-fetching each selected PRN from the backend.
 * - the list's own sort/filter/page query from the latest selection, so the
 *   check-selection page returns to the same list view rather than a reset
 *   one, and the selection is known to belong to that query's year.
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

// The selection belongs to one year's list. Opening the list for another year
// starts again, so notes of one year are never accepted with another's.
export function keepSelectionForYear(request, userType, pathId, year) {
  const storedYear = getSelectedPrnsListQueryFromSession(
    request,
    userType,
    pathId
  ).year

  if (
    storedYear !== undefined &&
    year !== undefined &&
    Number(storedYear) !== Number(year)
  ) {
    clearSelectedPrnsFromSession(request, userType, pathId)
  }
}

function storeSelectedPrns(request, userType, pathId, prns) {
  setSelectedPrnIdsInSession(
    request,
    userType,
    pathId,
    prns.map((prn) => prn.id)
  )
  setSelectedPrnsDataInSession(request, userType, pathId, prns)
}

// The selected PRNs that have cached data, in selection order.
function readSelectedPrns(request, userType, pathId) {
  const prnsById = new Map(
    getSelectedPrnsDataFromSession(request, userType, pathId).map((prn) => [
      prn.id,
      prn
    ])
  )

  return getSelectedPrnIdsFromSession(request, userType, pathId)
    .map((id) => prnsById.get(id))
    .filter(Boolean)
}

// The materials of the PRNs each list filter shows, as the API filters them:
// "Paper" also lists fibre-based composite. Any other filter is one material.
const FILTER_MATERIALS = { Paper: ['Paper', 'Fibre'] }

// With a material filter applied, only the selected PRNs it lists stay
// selected; the rest are dropped, and stay dropped when the filter is cleared.
export function keepSelectionForFilter(request, userType, pathId, material) {
  if (!material) {
    return
  }

  const materials = FILTER_MATERIALS[material] ?? [material]
  const selected = readSelectedPrns(request, userType, pathId)
  const remaining = selected.filter((prn) => materials.includes(prn.material))

  if (remaining.length !== selected.length) {
    storeSelectedPrns(request, userType, pathId, remaining)
  }
}

/**
 * The selection once a list page is submitted: the PRNs kept from other pages,
 * plus the PRNs ticked on this page. A PRN on this page that isn't ticked is
 * left out, and a ticked id that isn't on this page is ignored.
 *
 * @param {object} request
 * @param {'producer'|'cso'} userType
 * @param {string} pathId
 * @param {object} page
 * @param {Array<object>} page.pagePrns the PRNs on the submitted page
 * @param {Array<string>} page.tickedIds the ids ticked on it
 * @returns {Array<object>} the selected PRNs
 */
export function mergePageSelection(
  request,
  userType,
  pathId,
  { pagePrns, tickedIds }
) {
  const pagePrnsById = new Map(pagePrns.map((prn) => [prn.id, prn]))
  const kept = readSelectedPrns(request, userType, pathId).filter(
    ({ id }) => !pagePrnsById.has(id)
  )
  // In the order they were ticked.
  const ticked = [...new Set(tickedIds)]
    .map((id) => pagePrnsById.get(id))
    .filter(Boolean)

  return [...kept, ...ticked]
}

// Drops the selected PRNs on this page that can no longer be selected (eg
// accepted or rejected on their own page since they were ticked).
export function pruneUnselectablePagePrns(
  request,
  userType,
  pathId,
  { pagePrns, isSelectable }
) {
  const unselectable = new Set(
    pagePrns.filter((prn) => !isSelectable(prn)).map(({ id }) => id)
  )
  const selected = readSelectedPrns(request, userType, pathId)
  const remaining = selected.filter(({ id }) => !unselectable.has(id))

  if (remaining.length !== selected.length) {
    storeSelectedPrns(request, userType, pathId, remaining)
  }
}

// Clears the whole selection: ids, cached PRN data and the list query. Call it
// once the selection is finished with, after any redirect that needs the list
// query has been built.
export function clearSelectedPrnsFromSession(request, userType, pathId) {
  request.yar.clear(sessionKey(userType, pathId))
  request.yar.clear(dataSessionKey(userType, pathId))
  request.yar.clear(listQuerySessionKey(userType, pathId))
}

// Empties the selection for the organisation or scheme in the request's path,
// once one of its PRNs has been accepted or rejected on its own page.
export function clearSelectedPrnsForRequest(request) {
  const { organisationId, schemeId } = request.params ?? {}

  if (organisationId) {
    clearSelectedPrnsFromSession(request, 'producer', organisationId)
  } else if (schemeId) {
    clearSelectedPrnsFromSession(request, 'cso', schemeId)
  }
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
