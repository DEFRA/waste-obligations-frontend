import { paths, isSafeReturnPath } from '#/config/paths.js'
import { isPublicPath } from '#/server/auth/public-paths.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import {
  appendLangQuery,
  persistAuthLocale
} from '#/server/common/helpers/i18n/locale-url.js'

export const requireAuth = {
  plugin: {
    name: 'require-auth',
    register(server) {
      server.ext('onPreAuth', (request, h) => {
        if (isPublicPath(request.path)) {
          return h.continue
        }

        if (request.yar?.get('credentials')) {
          return h.continue
        }

        const locale = getLocale(request)
        persistAuthLocale(request, locale)

        const returnPath = `${request.path}${request.url.search || ''}`
        if (isSafeReturnPath(returnPath)) {
          request.yar.set('authReturnUrl', returnPath)
        }

        return h.redirect(appendLangQuery(paths.signInOidc, locale)).takeover()
      })
    }
  }
}
