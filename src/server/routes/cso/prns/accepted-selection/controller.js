import { selectSchemePrns } from '#/server/routes/_shared/prns/prns-route-options.js'
import { buildPrnsAcceptedSelectionRoute } from '#/server/routes/_shared/prns/prns-accepted-selection-routes.js'

export const prnsAcceptedSelectionController = buildPrnsAcceptedSelectionRoute({
  path: '/cso/{schemeId}/prns/accepted-selection',
  paramKey: 'schemeId',
  userType: 'cso',
  // The page only needs the accepted PRNs held in the session; authorisation
  // is handled by currentComplianceScheme / approvedUser.
  pre: selectSchemePrns()
})

export const prnsAcceptedSelectionRoutes = [prnsAcceptedSelectionController]
