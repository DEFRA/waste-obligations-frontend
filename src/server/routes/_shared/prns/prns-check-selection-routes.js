import { now } from '#/server/common/helpers/clock.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { withQuery } from '#/server/common/helpers/paths.js'
import { canMultiSelectPrn } from './available-acceptance-years.js'
import { isPrnStatusEditable } from './prn-status.js'
import {
  csoCheckSelectedPrnsPath,
  csoPrnsPath,
  producerCheckSelectedPrnsPath,
  producerPrnsPath
} from './prns-paths.js'
import { prnsCheckSelectionRouteOptions } from './prns-route-options.js'
import { checkSelectionPayloadSchema } from './schema.js'
import {
  getSelectedPrnIdsFromSession,
  getSelectedPrnsDataFromSession,
  getSelectedPrnsListQueryFromSession,
  clearSelectedPrnsFromSession,
  removeSelectedPrnIdFromSession,
  setSelectedPrnIdsInSession,
  setSelectedPrnsDataInSession
} from './selected-prns-session.js'
import { buildCheckSelectedPrnsViewModel } from './view-models/check-selected-prns-view-model.js'

const CHECK_SELECTION_VIEW = '_shared/prns/views/prns-check-selection'

const PATHS = {
  producer: {
    list: producerPrnsPath,
    checkSelection: producerCheckSelectedPrnsPath
  },
  cso: { list: csoPrnsPath, checkSelection: csoCheckSelectedPrnsPath }
}

/**
 * @typedef {object} CheckSelectionContext
 * @property {'organisationId'|'schemeId'} paramKey
 * @property {'producer'|'cso'} userType
 */

// Reads the selected PRNs' data from the session rather than re-fetching each
// one from the backend: the list request that made the selection already
// loaded it (see prns-list-routes.js), so no per-page-view backend calls are
// needed here. A selected id with no cached data (eg an old session from
// before this page cached it) is dropped rather than failing the page.
function loadSelectedPrns(request, userType, id, prnIds) {
  const prnsById = new Map(
    getSelectedPrnsDataFromSession(request, userType, id).map((prn) => [
      prn.id,
      prn
    ])
  )

  return prnIds.map((prnId) => prnsById.get(prnId)).filter(Boolean)
}

// The selected PRNs that can still be accepted together. The session
// selection, and its cached data, are pruned to match, so a stale PRN never
// comes back.
function loadSelectablePrns(request, userType, id) {
  const selectedIds = getSelectedPrnIdsFromSession(request, userType, id)
  const prns = loadSelectedPrns(request, userType, id, selectedIds).filter(
    (prn) => isPrnStatusEditable(prn) && canMultiSelectPrn(prn, { now: now() })
  )

  setSelectedPrnIdsInSession(
    request,
    userType,
    id,
    prns.map((prn) => prn.id)
  )
  setSelectedPrnsDataInSession(request, userType, id, prns)

  return prns
}

// The list view the selection was made from, so "Go back" returns to the same
// sort/filter/page; falls back to the year alone.
function buildListHref(request, userType, id) {
  const storedListQuery = getSelectedPrnsListQueryFromSession(
    request,
    userType,
    id
  )
  const listQuery =
    Object.keys(storedListQuery).length > 0
      ? storedListQuery
      : { year: request.query.year }

  return withQuery(PATHS[userType].list(id), listQuery)
}

/**
 * @param {object} request
 * @param {object} h
 * @param {CheckSelectionContext} context
 */
function handleCheckSelectionGet(request, h, { paramKey, userType }) {
  const id = request.params[paramKey]
  const { year } = request.query
  const listHref = buildListHref(request, userType, id)
  const prns = loadSelectablePrns(request, userType, id)

  if (prns.length === 0) {
    clearSelectedPrnsFromSession(request, userType, id)

    return h.redirect(listHref)
  }

  return h.view(CHECK_SELECTION_VIEW, {
    [paramKey]: id,
    organisationName: request.pre?.organisation?.name,
    year,
    backLink: withForwardedPrefix(request, listHref),
    viewModel: buildCheckSelectedPrnsViewModel({
      prns,
      pathId: id,
      userType,
      locale: getLocale(request),
      request,
      year
    })
  })
}

/**
 * @param {object} request
 * @param {object} h
 * @param {CheckSelectionContext} context
 */
function handleCheckSelectionPost(request, h, { paramKey, userType }) {
  const id = request.params[paramKey]

  if (request.payload.goBack) {
    const listHref = buildListHref(request, userType, id)
    clearSelectedPrnsFromSession(request, userType, id)

    return h.redirect(listHref)
  }

  removeSelectedPrnIdFromSession(
    request,
    userType,
    id,
    request.payload.removePrnId
  )

  return h.redirect(PATHS[userType].checkSelection(id, request.query.year))
}

/**
 * Builds the GET + POST routes for the "check your selection before accepting"
 * page reached from "Accept selected PRNs and PERNs" on the list page.
 *
 * The selection, and the selected PRNs' data, are read from the session (see
 * selected-prns-session.js) rather than re-fetched from the backend. Any PRN
 * that is no longer awaiting acceptance or can no longer be multi-selected is
 * dropped from the selection. With nothing left the user is sent back to the
 * list.
 *
 * POST removes a single PRN from the selection, or with `goBack` clears it
 * and returns to the list.
 *
 * @param {object} options
 * @param {string} options.path
 * @param {'organisationId'|'schemeId'} options.paramKey
 * @param {'producer'|'cso'} options.userType
 * @param {Array} options.pre
 * @returns {[object, object]} `[getController, postController]`
 */
export function buildPrnsCheckSelectionRoutes({
  path,
  paramKey,
  userType,
  pre
}) {
  const context = { paramKey, userType }

  const getController = {
    method: 'GET',
    path,
    options: { ...prnsCheckSelectionRouteOptions, pre },
    handler: (request, h) => handleCheckSelectionGet(request, h, context)
  }

  const postController = {
    method: 'POST',
    path,
    options: {
      ...prnsCheckSelectionRouteOptions,
      pre,
      validate: {
        ...prnsCheckSelectionRouteOptions.validate,
        payload: checkSelectionPayloadSchema
      }
    },
    handler: (request, h) => handleCheckSelectionPost(request, h, context)
  }

  return [getController, postController]
}
