import { prnRoutes as producerPrnRoutes } from './producer/prns/prn/controller.js'
import { prnsListRoutes as producerPrnsListRoutes } from './producer/prns/controller.js'
import { prnConfirmAcceptRoutes as producerPrnConfirmAcceptRoutes } from './producer/prns/prn/confirm-accept/controller.js'
import { prnRoutes as csoPrnRoutes } from './cso/prns/prn/controller.js'
import { prnConfirmAcceptRoutes as csoPrnConfirmAcceptRoutes } from './cso/prns/prn/confirm-accept/controller.js'
import { prnsListRoutes as csoPrnsListRoutes } from './cso/prns/controller.js'

export const organisations = {
  plugin: {
    name: 'organisations',
    register(server) {
      server.route([
        ...producerPrnsListRoutes,
        ...producerPrnRoutes,
        ...producerPrnConfirmAcceptRoutes,
        ...csoPrnsListRoutes,
        ...csoPrnRoutes,
        ...csoPrnConfirmAcceptRoutes
      ])
    }
  }
}
