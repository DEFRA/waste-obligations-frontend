import { healthAllController, healthController } from './controller.js'
import { paths } from '#/config/paths.js'
import { healthAllAccess } from './access.js'

export const health = {
  plugin: {
    name: 'health',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: paths.health,
          ...healthController
        },
        {
          method: 'GET',
          path: paths.healthAll,
          options: {
            pre: [{ method: healthAllAccess }]
          },
          ...healthAllController
        }
      ])
    }
  }
}
