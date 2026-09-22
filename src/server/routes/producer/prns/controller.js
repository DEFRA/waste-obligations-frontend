import * as complianceMiddlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import * as producerPrnMiddlewares from '#/server/routes/producer/_middlewares/index.js'
import { selectProducerPrns } from '#/server/routes/_shared/prns/prns-route-options.js'
import { buildPrnsListRoutes } from '#/server/routes/_shared/prns/prns-list-routes.js'

export const prnsListRoutes = buildPrnsListRoutes({
  path: '/producer/{organisationId}/prns',
  paramKey: 'organisationId',
  userType: 'producer',
  pre: selectProducerPrns(
    complianceMiddlewares.organisation,
    producerPrnMiddlewares.prns
  )
})

export const [prnsListController, prnsListPostController] = prnsListRoutes
