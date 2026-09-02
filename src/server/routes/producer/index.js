import { certificateRoutes } from './compliance/certificate/controller.js'
import { certificateSubmitRoutes } from './compliance/certificate-submit/controller.js'
import { certificateSuccessRoutes } from './compliance/certificate-success/controller.js'
import { certificateViewRoutes } from './compliance/certificate-view/controller.js'
import { prnRoutes } from './prns/prn/controller.js'
import { prnsListRoutes } from './prns/controller.js'

export const producer = {
  plugin: {
    name: 'producer',
    register(server) {
      server.route([
        ...certificateRoutes,
        ...certificateSubmitRoutes,
        ...certificateSuccessRoutes,
        ...certificateViewRoutes,
        ...prnsListRoutes,
        ...prnRoutes
      ])
    }
  }
}
