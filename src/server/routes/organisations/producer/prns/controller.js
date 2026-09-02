import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import * as complianceMiddlewares from '#/server/routes/compliance/_middlewares/index.js'
import * as organisationsMiddlewares from '#/server/routes/organisations/producer/_middlewares/index.js'
import {
  organisationPrnsRouteOptions,
  selectOrganisationPrns
} from '#/server/routes/organisations/_shared/organisations-route-options.js'
import { buildPrnsViewModel } from '#/server/routes/organisations/view-models/prns-view-model.js'

export const prnsListController = {
  method: 'GET',
  path: '/organisations/producer/{organisationId}/prns',
  options: {
    ...organisationPrnsRouteOptions,
    pre: selectOrganisationPrns(
      complianceMiddlewares.organisation,
      organisationsMiddlewares.prns
    )
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const locale = getLocale(request)
    const { prns, total, page, pageSize } = request.pre.prns

    return h.view('organisations/views/prns', {
      organisationId,
      organisationName: request.pre?.organisation?.name,
      prns,
      total,
      page,
      pageSize,
      prnsViewModel: buildPrnsViewModel({
        prns,
        pathId: organisationId,
        userType: 'producer',
        locale,
        request
      })
    })
  }
}

export const prnsListRoutes = [prnsListController]
