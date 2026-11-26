import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { canMultiSelectPrn } from './available-acceptance-years.js'
import { isPrnStatusEditable } from './prn-status.js'
import { buildPrnsOutOfRangePageRedirect } from './prns-pagination.js'
import {
  csoCheckSelectedPrnsPath,
  csoPrnsSelectionPath,
  producerCheckSelectedPrnsPath,
  producerPrnsSelectionPath
} from './prns-paths.js'
import { prnsRouteOptions } from './prns-route-options.js'
import { prnsListPayloadSchema } from './schema.js'
import {
  getSelectedPrnIds,
  getSelectedPrnsFormErrors
} from './selected-prns-validation.js'
import {
  clearAcceptedPrnsFromSession,
  getSelectedPrnIdsFromSession,
  keepSelectionForFilter,
  keepSelectionForYear,
  mergePageSelection,
  pickListQuery,
  pruneUnselectablePagePrns,
  setSelectedPrnIdsInSession,
  setSelectedPrnsDataInSession,
  setSelectedPrnsListQueryInSession
} from './selected-prns-session.js'
import { buildPrnsViewModel } from './view-models/prns-view-model.js'
import { now } from '#/server/common/helpers/clock.js'

const PRNS_LIST_VIEW = '_shared/prns/views/prns'

const CHECK_SELECTION_PATHS = {
  producer: producerCheckSelectedPrnsPath,
  cso: csoCheckSelectedPrnsPath
}

const SELECTION_PATHS = {
  producer: producerPrnsSelectionPath,
  cso: csoPrnsSelectionPath
}

// A PRN that can be ticked: still awaiting acceptance, and multi-selectable
// at `at`, as on the check-selection page.
function isSelectablePrn(prn, at) {
  return isPrnStatusEditable(prn) && canMultiSelectPrn(prn, { now: at })
}

/**
 * @typedef {object} PrnsListContext
 * @property {'organisationId'|'schemeId'} paramKey
 * @property {'producer'|'cso'} userType
 */

/**
 * @param {object} request
 * @param {object} h
 * @param {PrnsListContext} context
 * @param {object|null} [formErrors]
 */
function renderList(request, h, { paramKey, userType }, formErrors = null) {
  const id = request.params[paramKey]
  const { prns, total, page, pageSize } = request.pre.prns

  return h.view(PRNS_LIST_VIEW, {
    [paramKey]: id,
    organisationName: request.pre?.organisation?.name,
    prns,
    total,
    page,
    pageSize,
    year: request.query.year,
    backLink: request.app.backLinkHref,
    formErrors,
    selectionHref: withForwardedPrefix(
      request,
      SELECTION_PATHS[userType](id, pickListQuery(request.query))
    ),
    prnsViewModel: buildPrnsViewModel({
      prns,
      pathId: id,
      userType,
      locale: getLocale(request),
      request,
      page,
      pageSize,
      total,
      now: now(),
      selectedPrnIds: getSelectedPrnIdsFromSession(request, userType, id)
    })
  })
}

/**
 * @param {object} request
 * @param {object} h
 * @param {PrnsListContext} context
 */
function handleListGet(request, h, context) {
  // The list shows the selection kept in the session, ticked, so the user finds
  // it as they left it. A selection for another year is dropped, as are the
  // selected PRNs a material filter doesn't list, the PRNs on this page that can
  // no longer be selected, and the confirmation of an earlier bulk accept.
  const id = request.params[context.paramKey]
  const { prns, total, page, pageSize } = request.pre.prns
  const at = now()
  keepSelectionForYear(request, context.userType, id, request.query.year)
  keepSelectionForFilter(request, context.userType, id, request.query.material)
  pruneUnselectablePagePrns(request, context.userType, id, {
    pagePrns: prns,
    isSelectable: (prn) => isSelectablePrn(prn, at)
  })
  clearAcceptedPrnsFromSession(request, context.userType, id)

  const redirectTo = buildPrnsOutOfRangePageRedirect({
    prns,
    page,
    pageSize,
    total,
    userType: context.userType,
    pathId: request.params[context.paramKey],
    request
  })

  if (redirectTo) {
    return h.redirect(redirectTo)
  }

  return renderList(request, h, context)
}

/**
 * Stores the selected PRNs, their data and the list's own query, for the
 * check-selection page and its way back to the list.
 */
function storeSelection(request, userType, id, selectedPrns) {
  setSelectedPrnIdsInSession(
    request,
    userType,
    id,
    selectedPrns.map((prn) => prn.id)
  )
  setSelectedPrnsDataInSession(request, userType, id, selectedPrns)
  setSelectedPrnsListQueryInSession(request, userType, id, request.query)
}

/**
 * @param {object} request
 * @param {object} h
 * @param {PrnsListContext} context
 */
function handleListPost(request, h, context) {
  const { paramKey, userType } = context
  const id = request.params[paramKey]
  keepSelectionForYear(request, userType, id, request.query.year)
  keepSelectionForFilter(request, userType, id, request.query.material)

  // The PRNs ticked on this page, with those kept from other pages.
  const selectedPrns = mergePageSelection(request, userType, id, {
    pagePrns: request.pre.prns.prns,
    tickedIds: getSelectedPrnIds(request.payload)
  })
  const formErrors = getSelectedPrnsFormErrors(
    selectedPrns.map((prn) => prn.id),
    getLocale(request)
  )

  if (formErrors) {
    return renderList(request, h, context, formErrors)
  }

  storeSelection(request, userType, id, selectedPrns)

  return h.redirect(CHECK_SELECTION_PATHS[userType](id, request.query.year))
}

/**
 * Saves the ticks on one list page in the session as the user makes them, so
 * the selection survives leaving the list by a link (eg to open a PRN). The
 * page's ticks replace what was selected on it; PRNs kept from other pages
 * stay. A ticked id that isn't on the page, or can't be selected, is ignored.
 *
 * @param {object} request
 * @param {object} h
 * @param {PrnsListContext} context
 */
function handleSelectionPost(request, h, { paramKey, userType }) {
  const id = request.params[paramKey]
  const at = now()
  keepSelectionForYear(request, userType, id, request.query.year)
  keepSelectionForFilter(request, userType, id, request.query.material)

  const pagePrns = request.pre.prns.prns
  const selectableIds = new Set(
    pagePrns.filter((prn) => isSelectablePrn(prn, at)).map((prn) => prn.id)
  )
  const selectedPrns = mergePageSelection(request, userType, id, {
    pagePrns,
    tickedIds: getSelectedPrnIds(request.payload).filter((prnId) =>
      selectableIds.has(prnId)
    )
  })

  storeSelection(request, userType, id, selectedPrns)

  return h.response().code(statusCodes.noContent)
}

/**
 * Builds the GET + POST routes for the awaiting-acceptance PRNs/PERNs list.
 *
 * Producer and CSO journeys are identical apart from their path param
 * (`organisationId` vs `schemeId`), user type, and pre-handler list.
 *
 * GET shows the selection kept in the session ticked. POST adds the PRNs
 * ticked on this page to those kept from other pages, validates that at least
 * one is selected, stores the selection in the session and redirects to the
 * check-selection page. POST `<path>/selection` saves the page's ticks as they
 * are made, with no redirect.
 *
 * @param {object} options
 * @param {string} options.path
 * @param {'organisationId'|'schemeId'} options.paramKey
 * @param {'producer'|'cso'} options.userType
 * @param {Array} options.pre
 * @returns {[object, object, object]} `[getController, postController, selectionController]`
 */
export function buildPrnsListRoutes({ path, paramKey, userType, pre }) {
  const context = { paramKey, userType }

  const getController = {
    method: 'GET',
    path,
    options: { ...prnsRouteOptions, pre },
    handler: (request, h) => handleListGet(request, h, context)
  }

  const postController = {
    method: 'POST',
    path,
    options: {
      ...prnsRouteOptions,
      pre,
      validate: {
        ...prnsRouteOptions.validate,
        payload: prnsListPayloadSchema
      }
    },
    handler: (request, h) => handleListPost(request, h, context)
  }

  const selectionController = {
    method: 'POST',
    path: `${path}/selection`,
    options: {
      ...prnsRouteOptions,
      pre,
      validate: {
        ...prnsRouteOptions.validate,
        payload: prnsListPayloadSchema
      }
    },
    handler: (request, h) => handleSelectionPost(request, h, context)
  }

  return [getController, postController, selectionController]
}
