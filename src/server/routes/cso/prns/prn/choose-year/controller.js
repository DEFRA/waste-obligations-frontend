import * as csoPrnMiddlewares from '#/server/routes/cso/_middlewares/index.js'
import { singleSchemePrn } from '#/server/routes/_shared/prns/prns-route-options.js'
import {
  csoConfirmAcceptPrnPath,
  csoPrnPath
} from '#/server/routes/_shared/prns/prns-paths.js'
import { buildPrnChooseYearRoutes } from '#/server/routes/_shared/prns/prn-choose-year-routes.js'

export const prnChooseYearRoutes = buildPrnChooseYearRoutes({
  path: '/cso/{schemeId}/prns/{prnId}/choose-year',
  paramKey: 'schemeId',
  pre: singleSchemePrn(csoPrnMiddlewares.prn),
  prnPath: csoPrnPath,
  confirmAcceptPath: csoConfirmAcceptPrnPath
})

export const [prnChooseYearController, prnChooseYearPostController] =
  prnChooseYearRoutes
