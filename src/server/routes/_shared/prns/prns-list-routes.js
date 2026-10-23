import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { buildPrnsOutOfRangePageRedirect } from './prns-pagination.js'
import {
  csoCheckSelectedPrnsPath,
  producerCheckSelectedPrnsPath
} from './prns-paths.js'
import { prnsRouteOptions } from './prns-route-options.js'
import { prnsListPayloadSchema } from './schema.js'
import {
  getSelectedPrnIds,
  getSelectedPrnsFormErrors
} from './selected-prns-validation.js'
import {
  clearAcceptedPrnsFromSession,
  clearSelectedPrnsFromSession,
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
    prnsViewModel: buildPrnsViewModel({
      prns,
      pathId: id,
      userType,
      locale: getLocale(request),
      request,
      page,
      pageSize,
      total,
      now: now()
    })
  })
}

/**
 * @param {object} request
 * @param {object} h
 * @param {PrnsListContext} context
 */
function handleListGet(request, h, context) {
  // Opening the list starts a fresh selection, so drop any left over from an
  // earlier visit to the check-selection page, and the confirmation of an
  // earlier bulk accept.
  const id = request.params[context.paramKey]
  clearSelectedPrnsFromSession(request, context.userType, id)
  clearAcceptedPrnsFromSession(request, context.userType, id)

  const { prns, total, page, pageSize } = request.pre.prns
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
 * Stores the selected ids, their PRN data from this list request and the
 * list's own query, for the check-selection page and its "Go back".
 */
function storeSelection(request, userType, id, selectedPrnIds) {
  const selectedPrns = request.pre.prns.prns.filter((prn) =>
    selectedPrnIds.includes(prn.id)
  )

  setSelectedPrnIdsInSession(request, userType, id, selectedPrnIds)
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
  const selectedPrnIds = getSelectedPrnIds(request.payload)
  const formErrors = getSelectedPrnsFormErrors(
    selectedPrnIds,
    getLocale(request)
  )

  if (formErrors) {
    return renderList(request, h, context, formErrors)
  }

  storeSelection(request, userType, id, selectedPrnIds)

  return h.redirect(CHECK_SELECTION_PATHS[userType](id, request.query.year))
}

/**
 * Builds the GET + POST routes for the awaiting-acceptance PRNs/PERNs list.
 *
 * Producer and CSO journeys are identical apart from their path param
 * (`organisationId` vs `schemeId`), user type, and pre-handler list.
 *
 * POST validates that at least one PRN was checked, then stores the selection
 * in the session and redirects to the check-selection page.
 *
 * @param {object} options
 * @param {string} options.path
 * @param {'organisationId'|'schemeId'} options.paramKey
 * @param {'producer'|'cso'} options.userType
 * @param {Array} options.pre
 * @returns {[object, object]} `[getController, postController]`
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

  return [getController, postController]
}
