import { selectSchemePrns } from '#/server/routes/_shared/prns/prns-route-options.js'
import { buildPrnsCheckSelectionRoutes } from '#/server/routes/_shared/prns/prns-check-selection-routes.js'

export const prnsCheckSelectionRoutes = buildPrnsCheckSelectionRoutes({
  path: '/cso/{schemeId}/prns/check-selection',
  paramKey: 'schemeId',
  userType: 'cso',
  // The page only needs the selected PRNs, which it loads from the session
  // selection; authorisation is handled by currentComplianceScheme / approvedUser.
  pre: selectSchemePrns()
})

export const [prnsCheckSelectionController, prnsCheckSelectionPostController] =
  prnsCheckSelectionRoutes
