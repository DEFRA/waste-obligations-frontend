import { selectProducerPrns } from '#/server/routes/_shared/prns/prns-route-options.js'
import { buildPrnsAcceptedSelectionRoute } from '#/server/routes/_shared/prns/prns-accepted-selection-routes.js'

export const prnsAcceptedSelectionController = buildPrnsAcceptedSelectionRoute({
  path: '/producer/{organisationId}/prns/accepted-selection',
  paramKey: 'organisationId',
  userType: 'producer',
  pre: selectProducerPrns()
})

export const prnsAcceptedSelectionRoutes = [prnsAcceptedSelectionController]
