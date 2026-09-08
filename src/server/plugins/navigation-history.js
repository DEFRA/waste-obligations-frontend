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

      // Record before yar's onPreResponse commits the session cookie.
      server.ext('onPostHandler', (request, h) => {
        recordNavigationHistory(request)
        return h.continue
      })
    }
  }
}
