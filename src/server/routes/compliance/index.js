import { certificateRoutes } from './producer/certificate/controller.js'
import { certificateSubmitRoutes } from './producer/certificate-submit/controller.js'
import { certificateSuccessRoutes } from './producer/certificate-success/controller.js'
import { certificateViewRoutes } from './producer/certificate-view/controller.js'
import { statementRoutes } from './cso/statement/controller.js'
import { statementSubmitRoutes } from './cso/statement-submit/controller.js'

export const compliance = {
  plugin: {
    name: 'compliance',
    register(server) {
      server.route([
        ...certificateRoutes,
        ...certificateSubmitRoutes,
        ...certificateSuccessRoutes,
        ...certificateViewRoutes,
        ...statementRoutes,
        ...statementSubmitRoutes
      ])
    }
  }
}
