import * as organisationsMiddlewares from '#/server/routes/organisations/cso/_middlewares/index.js'
import { csoPre } from '#/server/routes/organisations/_shared/organisations-route-options.js'
import { csoPrnPath } from '#/server/routes/organisations/_shared/organisations-paths.js'
import { buildPrnConfirmAcceptRoutes } from '#/server/routes/organisations/_shared/prn-confirm-accept-routes.js'

export const prnConfirmAcceptRoutes = buildPrnConfirmAcceptRoutes({
  path: '/organisations/cso/{schemeId}/prns/{prnId}/confirm-accept',
  paramKey: 'schemeId',
  // The confirm page only needs the PRN itself; it never reads
  // `request.pre.organisation`, so the organisation pre-handler is deliberately
  // omitted (authorisation is handled by currentComplianceScheme / approvedUser).
  pre: csoPre(organisationsMiddlewares.prn),
  prnPath: csoPrnPath
})

export const [prnConfirmAcceptController, prnConfirmAcceptPostController] =
  prnConfirmAcceptRoutes
