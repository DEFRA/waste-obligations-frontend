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
  removeSelectedPrnIdFromSession,
  setSelectedPrnIdsInSession
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
 * POST removes a single PRN from the selection.
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
  const paths = PATHS[userType]

  function buildListHref(request, id) {
    const storedListQuery = getSelectedPrnsListQueryFromSession(
      request,
      userType,
      id
    )
    const listQuery =
      Object.keys(storedListQuery).length > 0
        ? storedListQuery
        : { year: request.query.year }

    return withQuery(paths.list(id), listQuery)
  }

  const getController = {
    method: 'GET',
    path,
    options: { ...prnsCheckSelectionRouteOptions, pre },
    handler(request, h) {
      const id = request.params[paramKey]
      const { year } = request.query
      const listHref = buildListHref(request, id)
      const selectedIds = getSelectedPrnIdsFromSession(request, userType, id)

      if (selectedIds.length === 0) {
        return h.redirect(listHref)
      }

      const prns = loadSelectedPrns(request, userType, id, selectedIds).filter(
        (prn) => isPrnStatusEditable(prn) && canMultiSelectPrn(prn)
      )

      setSelectedPrnIdsInSession(
        request,
        userType,
        id,
        prns.map((prn) => prn.id)
      )

      if (prns.length === 0) {
        return h.redirect(listHref)
      }

      const listUrl = withForwardedPrefix(request, listHref)

      return h.view(CHECK_SELECTION_VIEW, {
        [paramKey]: id,
        organisationName: request.pre?.organisation?.name,
        year,
        backLink: listUrl,
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
    handler(request, h) {
      const id = request.params[paramKey]

      if (request.payload.goBack) {
        setSelectedPrnIdsInSession(request, userType, id, [])

        return h.redirect(buildListHref(request, id))
      }

      removeSelectedPrnIdFromSession(
        request,
        userType,
        id,
        request.payload.removePrnId
      )

      return h.redirect(paths.checkSelection(id, request.query.year))
    }
  }

  return [getController, postController]
}
