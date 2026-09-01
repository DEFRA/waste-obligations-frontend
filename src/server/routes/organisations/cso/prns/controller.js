import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import * as complianceMiddlewares from '#/server/routes/compliance/_middlewares/index.js'
import * as organisationsMiddlewares from '#/server/routes/organisations/cso/_middlewares/index.js'
import {
  organisationPrnsRouteOptions,
  csoPre
} from '#/server/routes/organisations/_shared/organisations-route-options.js'
import { buildPrnsViewModel } from '#/server/routes/organisations/view-models/prns-view-model.js'

export const prnsListController = {
  method: 'GET',
  path: '/organisations/cso/{schemeId}/prns',
  options: {
    ...organisationPrnsRouteOptions,
    pre: csoPre(
      complianceMiddlewares.organisation,
      organisationsMiddlewares.prns
    )
  },
  async handler(request, h) {
    const { schemeId } = request.params
    const locale = getLocale(request)
    const { prns, total, page, pageSize } = request.pre.prns

    return h.view('organisations/views/prns', {
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
