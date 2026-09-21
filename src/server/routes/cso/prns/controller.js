import * as complianceMiddlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import * as csoPrnMiddlewares from '#/server/routes/cso/_middlewares/index.js'
import { selectSchemePrns } from '#/server/routes/_shared/prns/prns-route-options.js'
import { buildPrnsListRoutes } from '#/server/routes/_shared/prns/prns-list-routes.js'

export const prnsListRoutes = buildPrnsListRoutes({
  path: '/cso/{schemeId}/prns',
  paramKey: 'schemeId',
  userType: 'cso',
  pre: selectSchemePrns(
    complianceMiddlewares.organisation,
    csoPrnMiddlewares.prns
  )
})

export const [prnsListController, prnsListPostController] = prnsListRoutes
