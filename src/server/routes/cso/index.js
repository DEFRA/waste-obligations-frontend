import { config } from '#/config/config.js'
import { statementRoutes } from './compliance/statement/controller.js'
import { statementSubmitRoutes } from './compliance/statement-submit/controller.js'
import { statementSuccessRoutes } from './compliance/statement-success/controller.js'
import { statementViewRoutes } from './compliance/statement-view/controller.js'
import { obligationsRoutes } from './obligations/controller.js'
import { prnRoutes } from './prns/prn/controller.js'
import { prnsListRoutes } from './prns/controller.js'

export const cso = {
  plugin: {
    name: 'cso',
    register(server) {
      const routes = [
        ...statementRoutes,
        ...statementSubmitRoutes,
        ...statementSuccessRoutes,
        ...statementViewRoutes,
        ...prnsListRoutes,
        ...prnRoutes
      ]

      if (config.get('features.manageObligations')) {
        routes.push(...obligationsRoutes)
      }

      server.route(routes)
    }
  }
}
