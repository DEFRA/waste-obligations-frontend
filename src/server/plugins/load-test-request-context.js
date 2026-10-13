import { config } from '#/config/config.js'
import { bindLoadTestRequestContext } from '#/server/common/helpers/load-test/request-context.js'

export function createLoadTestRequestContextPlugin({
  enabled = config.get('loadTest.headerForwardingEnabled')
} = {}) {
  return {
    name: 'load-test-request-context',
    version: '1.0.0',
    register(server) {
      server.ext('onRequest', (request, h) => {
        bindLoadTestRequestContext(request, { enabled })
        return h.continue
      })
    }
  }
}

export const loadTestRequestContext = createLoadTestRequestContextPlugin()
