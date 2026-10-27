import * as csoPrnMiddlewares from '#/server/routes/cso/_middlewares/index.js'
import { singleSchemePrn } from '#/server/routes/_shared/prns/prns-route-options.js'
import { csoPrnPath } from '#/server/routes/_shared/prns/prns-paths.js'
import { buildPrnConfirmRejectRoutes } from '#/server/routes/_shared/prns/prn-confirm-reject-routes.js'

export const prnConfirmRejectRoutes = buildPrnConfirmRejectRoutes({
  path: '/cso/{schemeId}/prns/{prnId}/confirm-reject',
  paramKey: 'schemeId',
  // The confirm page only needs the PRN itself; it never reads
  // `request.pre.organisation`, so the organisation pre-handler is deliberately
  // omitted (authorisation is handled by currentComplianceScheme / approvedUser).
  pre: singleSchemePrn(csoPrnMiddlewares.prn),
  prnPath: csoPrnPath
})

export const [prnConfirmRejectController, prnConfirmRejectPostController] =
  prnConfirmRejectRoutes
