import { healthAllController, healthController } from './controller.js'
import { paths } from '#/config/paths.js'

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
          ...healthAllController
        }
      ])
    }
  }
}
