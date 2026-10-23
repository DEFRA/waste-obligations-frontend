import { now } from '#/server/common/helpers/clock.js'
import Boom from '@hapi/boom'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { withQuery } from '#/server/common/helpers/paths.js'
import { ApiError } from '#/server/services/base/api-error.js'
import { PRN_STATUS } from '#/server/services/schemas/waste-obligations.schemas.js'
import {
  canMultiSelectPrn,
  resolveSelectionAcceptanceYear
} from './available-acceptance-years.js'
import { isPrnStatusEditable } from './prn-status.js'
import { submitPrnStatusesUpdate } from './prn-status-update.js'
import {
  csoAcceptedSelectionPrnsPath,
  csoCheckSelectedPrnsPath,
  csoPrnsPath,
  producerAcceptedSelectionPrnsPath,
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
  setAcceptedPrnsInSession,
  setSelectedPrnIdsInSession,
  setSelectedPrnsDataInSession
} from './selected-prns-session.js'
import { buildCheckSelectedPrnsViewModel } from './view-models/check-selected-prns-view-model.js'

const CHECK_SELECTION_VIEW = '_shared/prns/views/prns-check-selection'

const PATHS = {
  producer: {
    list: producerPrnsPath,
    checkSelection: producerCheckSelectedPrnsPath,
    acceptedSelection: producerAcceptedSelectionPrnsPath
  },
  cso: {
    list: csoPrnsPath,
    checkSelection: csoCheckSelectedPrnsPath,
    acceptedSelection: csoAcceptedSelectionPrnsPath
  }
}

/**
 * @typedef {object} CheckSelectionContext
 * @property {'organisationId'|'schemeId'} paramKey
 * @property {'producer'|'cso'} userType
 */

// The number of selected PRNs re-read from the backend at once.
const CURRENT_READ_BATCH_SIZE = 10

// The selected PRNs' data as the list cached it when the selection was made.
// It can be out of date, so it is only a starting point: see readCurrentPrns.
// A selected id with no cached data (eg an old session from before this page
// cached it) is dropped rather than failing the page.
function loadSelectedPrns(request, userType, id, prnIds) {
  const prnsById = new Map(
    getSelectedPrnsDataFromSession(request, userType, id).map((prn) => [
      prn.id,
      prn
    ])
  )

  return prnIds.map((prnId) => prnsById.get(prnId)).filter(Boolean)
}

function isAcceptedForYear(reviewed, current, selectedCount, year) {
  return (
    year !== undefined &&
    reviewed.every((prn) => prn.status === PRN_STATUS.AWAITING_ACCEPTANCE) &&
    current.length === selectedCount &&
    current.every(
      (prn) => prn.status === PRN_STATUS.ACCEPTED && prn.obligationYear === year
    )
  )
}

// Re-reads one selected PRN from the backend. Resolves to null when the PRN no
// longer exists (404); any other failure is rethrown.
async function readCurrentPrn(request, id, prnId) {
  try {
    return await request.server.app.wasteObligationsApi.getPrn(id, prnId)
  } catch (error) {
    if (error instanceof ApiError && error.status === statusCodes.notFound) {
      return null
    }

    throw error
  }
}

// Re-reads each selected PRN from the backend, a batch at a time, so a PRN
// accepted or rejected since the list was loaded is seen as it is now. Returns
// the current PRNs and the number that no longer exist.
async function readCurrentPrns(request, id, prns) {
  const current = []
  let missing = 0

  for (let start = 0; start < prns.length; start += CURRENT_READ_BATCH_SIZE) {
    const batch = prns.slice(start, start + CURRENT_READ_BATCH_SIZE)
    const results = await Promise.all(
      batch.map((prn) => readCurrentPrn(request, id, prn.id))
    )

    for (const prn of results) {
      if (prn) {
        current.push(prn)
      } else {
        missing += 1
      }
    }
  }

  return { current, missing }
}

// The selected PRNs that can still be accepted together at `at`, the request's
// clock reading (see clock.js), so selectability matches the list page,
// including under STARTUP_UTC_TIMESTAMP_OVERRIDE. Each is read again from the
// backend first. The session selection, and its cached data, are then pruned
// to the PRNs still selectable, so a stale PRN never comes back.
async function loadSelectablePrns(request, userType, id, at) {
  const selectedPrns = loadSelectedPrns(
    request,
    userType,
    id,
    getSelectedPrnIdsFromSession(request, userType, id)
  )
  const clock = now() ?? at;
  const { current, missing } = await readCurrentPrns(request, id, selectedPrns)
  const prns = current.filter(
    (prn) =>
      isPrnStatusEditable(prn) &&
      canMultiSelectPrn(prn, { now: clock }, { now: now() })
  )

  setSelectedPrnIdsInSession(
    request,
    userType,
    id,
    prns.map((prn) => prn.id)
  )
  setSelectedPrnsDataInSession(request, userType, id, prns)

  return { prns, current, missing }
}

// The list view the selection was made from, so "Go back" returns to the same
// sort/filter/page; falls back to the year alone.
function buildListQuery(request, userType, id) {
  const storedListQuery = getSelectedPrnsListQueryFromSession(
    request,
    userType,
    id
  )

  return Object.keys(storedListQuery).length > 0
    ? storedListQuery
    : { year: request.query.year }
}

function buildListHref(request, userType, id) {
  return withQuery(
    PATHS[userType].list(id),
    buildListQuery(request, userType, id)
  )
}

/**
 * @param {object} request
 * @param {object} h
 * @param {CheckSelectionContext} context
 */
async function renderCheckSelection(request, h, { paramKey, userType }) {
  const id = request.params[paramKey]
  const { year } = request.query
  const listHref = buildListHref(request, userType, id)
  const { prns } = await loadSelectablePrns(request, userType, id, now())

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
 * Accepts every selected PRN in one request. On success the selection is
 * cleared and the user sees the accepted-selection confirmation. When the API
 * rejects the batch nothing was accepted, and the selection no longer matches
 * the PRNs, so it is cleared before the error page: a 404 (a selected PRN no
 * longer exists) shows the not found page, and a conflict (409, 410 or 422: a
 * selected PRN is no longer awaiting acceptance) shows the general error
 * page. Any other failure keeps the selection so the user can try again.
 *
 * Before sending, a reviewed PRN that is no longer selectable is removed from
 * the session and the general error page is shown, with nothing accepted.
 *
 * @param {object} request
 * @param {object} h
 * @param {CheckSelectionContext} context
 */
async function handleCheckSelectionAccept(request, h, context) {
  const { paramKey, userType } = context
  const id = request.params[paramKey]
  // One clock reading for the whole accept, so the PRNs sent, the year they
  // are accepted into and the year shown on the confirmation all agree.
  const at = now()
  const selectedCount = getSelectedPrnIdsFromSession(
    request,
    userType,
    id
  ).length
  // The PRNs as the user reviewed them, before any re-read. The year the accept
  // would record is worked out from these, since an accepted PRN's stored year
  // is then the year it was accepted into.
  const reviewed = loadSelectedPrns(
    request,
    userType,
    id,
    getSelectedPrnIdsFromSession(request, userType, id)
  )
  const requestedYear = resolveSelectionAcceptanceYear(reviewed, { now: at })
  const { prns, current, missing } = await loadSelectablePrns(
    request,
    userType,
    id,
    at
  )

  if (selectedCount === 0) {
    const listHref = buildListHref(request, userType, id)
    clearSelectedPrnsFromSession(request, userType, id)

    return h.redirect(listHref)
  }

  // A selected PRN no longer exists: as for a 404 from the bulk update, the
  // user sees the not found page and nothing is accepted.
  if (missing > 0) {
    clearSelectedPrnsFromSession(request, userType, id)

    throw Boom.notFound()
  }

  // A reviewed PRN is no longer selectable (eg its acceptance window changed
  // since the page loaded). loadSelectablePrns has already removed it from
  // the session, so accept nothing rather than a different set from the one
  // the user checked.
  if (
    prns.length < selectedCount &&
    isAcceptedForYear(reviewed, current, selectedCount, requestedYear)
  ) {
    // The first request already accepted this selection into the year this one
    // would have used, so the user sees the same confirmation rather than an
    // error. Nothing is sent again.
    setAcceptedPrnsInSession(request, userType, id, reviewed, at)
    const listQuery = buildListQuery(request, userType, id)
    clearSelectedPrnsFromSession(request, userType, id)

    return h.redirect(
      withQuery(PATHS[userType].acceptedSelection(id), listQuery)
    )
  }

  if (prns.length < selectedCount) {
    request.logger.warn(
      `Bulk PRN accept stopped as selected PRNs are no longer selectable: organisationId=${id}, prnCount=${selectedCount}, removedCount=${selectedCount - prns.length}`
    )

    throw Boom.badImplementation()
  }

  const accepted = await submitPrnStatusesUpdate(
    request,
    prns.map((prn) => prn.id),
    'ACCEPTED',
    resolveSelectionAcceptanceYear(prns, { now: at })
  ).catch((error) => {
    if (Boom.isBoom(error, statusCodes.notFound)) {
      clearSelectedPrnsFromSession(request, userType, id)
    }

    throw error
  })

  if (!accepted) {
    clearSelectedPrnsFromSession(request, userType, id)

    throw Boom.badImplementation()
  }

  // Carry the list query to the confirmation, as "Go back" does, so it can
  // return to the same list view. Read it before the selection is cleared.
  const listWithQuery = buildListQuery(request, userType, id)
  setAcceptedPrnsInSession(request, userType, id, prns, at)
  clearSelectedPrnsFromSession(request, userType, id)

  return h.redirect(
    withQuery(PATHS[userType].acceptedSelection(id), listWithQuery)
  )
}

/**
 * @param {object} request
 * @param {object} h
 * @param {CheckSelectionContext} context
 */
async function handleCheckSelectionPost(request, h, context) {
  const { paramKey, userType } = context
  const id = request.params[paramKey]

  if (request.payload.goBack) {
    const listHref = buildListHref(request, userType, id)
    clearSelectedPrnsFromSession(request, userType, id)

    return h.redirect(listHref)
  }

  if (request.payload.accept) {
    return handleCheckSelectionAccept(request, h, context)
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
 * POST accepts every selected PRN (`accept`), removes a single PRN from the
 * selection (`removePrnId`), or clears the selection and returns to the list
 * (`goBack`).
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
    handler: (request, h) => renderCheckSelection(request, h, context)
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
