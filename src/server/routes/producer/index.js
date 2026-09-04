import { config } from '#/config/config.js'
import { certificateRoutes } from './compliance/certificate/controller.js'
import { certificateSubmitRoutes } from './compliance/certificate-submit/controller.js'
import { certificateSuccessRoutes } from './compliance/certificate-success/controller.js'
import { certificateViewRoutes } from './compliance/certificate-view/controller.js'
import { obligationsRoutes } from './obligations/controller.js'
import { prnRoutes } from './prns/prn/controller.js'
import { prnsListRoutes } from './prns/controller.js'

export const producer = {
  plugin: {
    name: 'producer',
    register(server) {
      const routes = [
        ...certificateRoutes,
        ...certificateSubmitRoutes,
        ...certificateSuccessRoutes,
        ...certificateViewRoutes,
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
