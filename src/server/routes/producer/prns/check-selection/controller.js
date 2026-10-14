import { selectProducerPrns } from '#/server/routes/_shared/prns/prns-route-options.js'
import { buildPrnsCheckSelectionRoutes } from '#/server/routes/_shared/prns/prns-check-selection-routes.js'

export const prnsCheckSelectionRoutes = buildPrnsCheckSelectionRoutes({
  path: '/producer/{organisationId}/prns/check-selection',
  paramKey: 'organisationId',
  userType: 'producer',
  // The page only needs the selected PRNs, which it loads from the session
  // selection; authorisation is handled by currentOrganisation / approvedUser.
  pre: selectProducerPrns()
})

export const [prnsCheckSelectionController, prnsCheckSelectionPostController] =
  prnsCheckSelectionRoutes
