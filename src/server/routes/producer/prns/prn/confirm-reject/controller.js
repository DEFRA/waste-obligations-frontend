import * as producerPrnMiddlewares from '#/server/routes/producer/_middlewares/index.js'
import { singlePrn } from '#/server/routes/_shared/prns/prns-route-options.js'
import { producerPrnPath } from '#/server/routes/_shared/prns/prns-paths.js'
import { buildPrnConfirmRejectRoutes } from '#/server/routes/_shared/prns/prn-confirm-reject-routes.js'

export const prnConfirmRejectRoutes = buildPrnConfirmRejectRoutes({
  path: '/producer/{organisationId}/prns/{prnId}/confirm-reject',
  paramKey: 'organisationId',
  // The confirm page only needs the PRN itself; it never reads
  // `request.pre.organisation`, so the organisation pre-handler is deliberately
  // omitted (authorisation is handled by currentOrganisation / approvedUser).
  pre: singlePrn(producerPrnMiddlewares.prn),
  prnPath: producerPrnPath
})

export const [prnConfirmRejectController, prnConfirmRejectPostController] =
  prnConfirmRejectRoutes
