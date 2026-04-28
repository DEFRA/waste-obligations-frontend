import { certificateController } from './certificate/controller.js'
import { statementController } from './statement/controller.js'

export const compliance = {
  plugin: {
    name: 'compliance',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/compliance/{organisationId}/certificate',
          ...certificateController
        },
        {
          method: 'GET',
          path: '/compliance/{organisationId}/statement',
          ...statementController
        }
      ])
    }
  }
}
