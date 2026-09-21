import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { prnsRouteOptions } from './prns-route-options.js'
import { prnsListPayloadSchema } from './schema.js'
import {
  getSelectedPrnIds,
  getSelectedPrnsFormErrors
} from './selected-prns-validation.js'
import { buildPrnsViewModel } from './view-models/prns-view-model.js'

const PRNS_LIST_VIEW = '_shared/prns/views/prns'

/**
 * Builds the GET + POST routes for the awaiting-acceptance PRNs/PERNs list.
 *
 * Producer and CSO journeys are identical apart from their path param
 * (`organisationId` vs `schemeId`), user type, and pre-handler list.
 *
 * POST currently only validates that at least one selectable PRN was checked.
 * Routing selected PRNs into the multi-select accept journey is out of scope.
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
        total
      })
    })
  }

  const getController = {
    method: 'GET',
    path,
    options: getRouteOptions,
    handler(request, h) {
      return renderList(request, h)
    }
  }

  const postController = {
    method: 'POST',
    path,
    options: postRouteOptions,
    handler(request, h) {
      const locale = getLocale(request)
      const formErrors = getSelectedPrnsFormErrors(
        getSelectedPrnIds(request.payload),
        locale
      )

      return renderList(request, h, formErrors)
    }
  }

  return [getController, postController]
}
