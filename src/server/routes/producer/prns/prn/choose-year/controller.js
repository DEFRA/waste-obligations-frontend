import * as producerPrnMiddlewares from '#/server/routes/producer/_middlewares/index.js'
import { singlePrn } from '#/server/routes/_shared/prns/prns-route-options.js'
import {
  producerConfirmAcceptPrnPath,
  producerPrnPath
} from '#/server/routes/_shared/prns/prns-paths.js'
import { buildPrnChooseYearRoutes } from '#/server/routes/_shared/prns/prn-choose-year-routes.js'

export const prnChooseYearRoutes = buildPrnChooseYearRoutes({
  path: '/producer/{organisationId}/prns/{prnId}/choose-year',
  paramKey: 'organisationId',
  pre: singlePrn(producerPrnMiddlewares.prn),
  prnPath: producerPrnPath,
  confirmAcceptPath: producerConfirmAcceptPrnPath
})

export const [prnChooseYearController, prnChooseYearPostController] =
  prnChooseYearRoutes
