import * as producerPrnMiddlewares from '#/server/routes/producer/_middlewares/index.js'
import { singlePrn } from '#/server/routes/_shared/prns/prns-route-options.js'
import { producerPrnPath } from '#/server/routes/_shared/prns/prns-paths.js'
import { buildPrnConfirmAcceptRoutes } from '#/server/routes/_shared/prns/prn-confirm-accept-routes.js'

export const prnConfirmAcceptRoutes = buildPrnConfirmAcceptRoutes({
  path: '/producer/{organisationId}/prns/{prnId}/confirm-accept',
  paramKey: 'organisationId',
  // The confirm page only needs the PRN itself; it never reads
  // `request.pre.organisation`, so the organisation pre-handler is deliberately
  // omitted (authorisation is handled by currentOrganisation / approvedUser).
  pre: singlePrn(producerPrnMiddlewares.prn),
  prnPath: producerPrnPath
})

export const [prnConfirmAcceptController, prnConfirmAcceptPostController] =
  prnConfirmAcceptRoutes
