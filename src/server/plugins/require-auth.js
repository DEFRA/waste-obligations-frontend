import { paths, isSafeReturnPath } from '#/config/paths.js'
import { isPublicPath } from '#/server/auth/public-paths.js'
import { getUserFromRequest } from '#/server/auth/user-session.js'

export const requireAuth = {
  plugin: {
    name: 'require-auth',
    register(server) {
      server.ext('onPreAuth', (request, h) => {
        if (isPublicPath(request.path)) {
          return h.continue
        }

        if (getUserFromRequest(request)) {
          return h.continue
        }

        const returnPath = `${request.path}${request.url.search || ''}`
        if (isSafeReturnPath(returnPath)) {
          request.yar.set('authReturnUrl', returnPath)
        }

        return h.redirect(paths.signinOidc).takeover()
      })
    }
  }
}
