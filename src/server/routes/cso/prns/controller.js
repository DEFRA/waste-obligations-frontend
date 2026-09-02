import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import * as complianceMiddlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import * as csoPrnMiddlewares from '#/server/routes/cso/_middlewares/index.js'
import {
  prnsRouteOptions,
  selectSchemePrns
} from '#/server/routes/_shared/prns/prns-route-options.js'
import { buildPrnsViewModel } from '#/server/routes/_shared/prns/view-models/prns-view-model.js'

export const prnsListController = {
  method: 'GET',
  path: '/cso/{schemeId}/prns',
  options: {
    ...prnsRouteOptions,
    pre: selectSchemePrns(
      complianceMiddlewares.organisation,
      csoPrnMiddlewares.prns
    )
  },
  async handler(request, h) {
    const { schemeId } = request.params
    const locale = getLocale(request)
    const { prns, total, page, pageSize } = request.pre.prns

    return h.view('_shared/prns/views/prns', {
      schemeId,
      organisationName: request.pre?.organisation?.name,
      prns,
      total,
      page,
      pageSize,
      prnsViewModel: buildPrnsViewModel({
        prns,
        pathId: schemeId,
        userType: 'cso',
        locale,
        request
      })
    })
  }
}

export const prnsListRoutes = [prnsListController]
