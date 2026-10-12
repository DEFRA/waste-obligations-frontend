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
  setSelectedPrnIdsInSession,
  setSelectedPrnsDataInSession,
  setSelectedPrnsListQueryInSession
} from './selected-prns-session.js'
import { buildPrnsViewModel } from './view-models/prns-view-model.js'
import { now } from '#/server/common/helpers/clock.js'

const PRNS_LIST_VIEW = '_shared/prns/views/prns'

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
  const getRouteOptions = { ...prnsRouteOptions, pre }
  const postRouteOptions = {
    ...prnsRouteOptions,
    pre,
    validate: {
      ...prnsRouteOptions.validate,
      payload: prnsListPayloadSchema
    }
  }

  function renderList(request, h, formErrors = null) {
    const id = request.params[paramKey]
    const locale = getLocale(request)
    const { prns, total, page, pageSize } = request.pre.prns
    const { year } = request.query

    return h.view(PRNS_LIST_VIEW, {
      [paramKey]: id,
      organisationName: request.pre?.organisation?.name,
      prns,
      total,
      page,
      pageSize,
      year,
      backLink: request.app.backLinkHref,
      formErrors,
      prnsViewModel: buildPrnsViewModel({
        prns,
        pathId: id,
        userType,
        locale,
        request,
        page,
        pageSize,
        total,
        now: now()
      })
    })
  }

  const getController = {
    method: 'GET',
    path,
    options: getRouteOptions,
    handler(request, h) {
      const { prns, total, page, pageSize } = request.pre.prns
      const redirectTo = buildPrnsOutOfRangePageRedirect({
        prns,
        page,
        pageSize,
        total,
        userType,
        pathId: request.params[paramKey],
        request
      })

      if (redirectTo) {
        return h.redirect(redirectTo)
      }

      return renderList(request, h)
    }
  }

  const postController = {
    method: 'POST',
    path,
    options: postRouteOptions,
    handler(request, h) {
      const id = request.params[paramKey]
      const selectedPrnIds = getSelectedPrnIds(request.payload)
      const formErrors = getSelectedPrnsFormErrors(
        selectedPrnIds,
        getLocale(request)
      )

      if (formErrors) {
        return renderList(request, h, formErrors)
      }

      const selectedPrns = request.pre.prns.prns.filter((prn) =>
        selectedPrnIds.includes(prn.id)
      )

      setSelectedPrnIdsInSession(request, userType, id, selectedPrnIds)
      setSelectedPrnsDataInSession(request, userType, id, selectedPrns)
      setSelectedPrnsListQueryInSession(request, userType, id, request.query)

      const checkSelectionPath =
        userType === 'cso'
          ? csoCheckSelectedPrnsPath
          : producerCheckSelectedPrnsPath

      return h.redirect(checkSelectionPath(id, request.query.year))
    }
  }

  return [getController, postController]
}
