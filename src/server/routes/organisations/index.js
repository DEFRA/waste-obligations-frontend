import { prnRoutes } from './prns/prn/controller.js'
import { prnsListRoutes } from './prns/controller.js'

export const organisations = {
  plugin: {
    name: 'organisations',
    register(server) {
      server.route([...prnsListRoutes, ...prnRoutes])
    }
  }
}
