import * as organisationsMiddlewares from '#/server/routes/organisations/producer/_middlewares/index.js'
import { organisationPre } from '#/server/routes/organisations/_shared/organisations-route-options.js'
import { producerPrnPath } from '#/server/routes/organisations/_shared/organisations-paths.js'
import { buildPrnConfirmAcceptRoutes } from '#/server/routes/organisations/_shared/prn-confirm-accept-routes.js'

export const prnConfirmAcceptRoutes = buildPrnConfirmAcceptRoutes({
  path: '/organisations/producer/{organisationId}/prns/{prnId}/confirm-accept',
  paramKey: 'organisationId',
  // The confirm page only needs the PRN itself; it never reads
  // `request.pre.organisation`, so the organisation pre-handler is deliberately
  // omitted (authorisation is handled by currentOrganisation / approvedUser).
  pre: organisationPre(organisationsMiddlewares.prn),
  prnPath: producerPrnPath
})

export const [prnConfirmAcceptController, prnConfirmAcceptPostController] =
  prnConfirmAcceptRoutes
