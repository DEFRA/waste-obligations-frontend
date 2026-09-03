import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import * as complianceMiddlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import * as producerPrnMiddlewares from '#/server/routes/producer/_middlewares/index.js'
import {
  prnsRouteOptions,
  selectProducerPrns
} from '#/server/routes/_shared/prns/prns-route-options.js'
import { buildPrnsViewModel } from '#/server/routes/_shared/prns/view-models/prns-view-model.js'

export const prnsListController = {
  method: 'GET',
  path: '/producer/{organisationId}/prns',
  options: {
    ...prnsRouteOptions,
    pre: selectProducerPrns(
      complianceMiddlewares.organisation,
      producerPrnMiddlewares.prns
    )
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const locale = getLocale(request)
    const { prns, total, page, pageSize } = request.pre.prns

    return h.view('_shared/prns/views/prns', {
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
