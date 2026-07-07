import { paths } from '#/config/paths.js'
import { cookiesController } from './controller.js'

export const cookies = {
  plugin: {
    name: 'cookies',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: paths.cookies,
          ...cookiesController
        }
      ])
    }
  }
}
