import { certificateRoutes } from './certificate/controller.js'
import { certificateSubmitRoutes } from './certificate-submit/controller.js'
import { certificateSuccessRoutes } from './certificate-success/controller.js'
import { certificateViewRoutes } from './certificate-view/controller.js'
import { statementRoutes } from './statement/controller.js'

export const compliance = {
  plugin: {
    name: 'compliance',
    register(server) {
      server.route([
        ...certificateRoutes,
        ...certificateSubmitRoutes,
        ...certificateSuccessRoutes,
        ...certificateViewRoutes,
        ...statementRoutes
      ])
    }
  }
}
