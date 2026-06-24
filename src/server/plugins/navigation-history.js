import {
  recordNavigationHistory,
  resolveBackLinkHref
} from '#/server/common/helpers/navigation/back-link.js'

export const navigationHistory = {
  plugin: {
    name: 'navigation-history',
    register(server) {
      server.ext('onPreHandler', (request, h) => {
        request.app.backLinkHref = resolveBackLinkHref(request)
        return h.continue
      })

      server.ext('onPreResponse', (request, h) => {
        recordNavigationHistory(request)
        return h.continue
      })
    }
  }
}
