import { config } from '#/config/config.js'
import { statementRoutes } from './compliance/statement/controller.js'
import { statementSubmitRoutes } from './compliance/statement-submit/controller.js'
import { statementSuccessRoutes } from './compliance/statement-success/controller.js'
import { statementViewRoutes } from './compliance/statement-view/controller.js'
import { obligationsRoutes } from './obligations/controller.js'
import { prnRoutes } from './prns/prn/controller.js'
import { prnConfirmAcceptRoutes } from './prns/prn/confirm-accept/controller.js'
import { prnConfirmRejectRoutes } from './prns/prn/confirm-reject/controller.js'
import { prnsListRoutes } from './prns/controller.js'
import { prnsCheckSelectionRoutes } from './prns/check-selection/controller.js'
import { prnsAcceptedSelectionRoutes } from './prns/accepted-selection/controller.js'

export const cso = {
  plugin: {
    name: 'cso',
    register(server) {
      const routes = [
        ...statementRoutes,
        ...statementSubmitRoutes,
        ...statementSuccessRoutes,
        ...statementViewRoutes
      ]

      if (config.get('features.showPrns')) {
        routes.push(
          ...prnsListRoutes,
          ...prnsCheckSelectionRoutes,
          ...prnsAcceptedSelectionRoutes,
          ...prnRoutes,
          ...prnConfirmAcceptRoutes,
          ...prnConfirmRejectRoutes
        )
      }

      if (config.get('features.manageObligations')) {
        routes.push(...obligationsRoutes)
      }

      server.route(routes)
    }
  }
}
