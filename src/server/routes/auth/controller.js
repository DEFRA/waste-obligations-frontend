import { config } from '#/config/config.js'
import { paths } from '#/config/paths.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { handleSignInOidc } from '#/server/routes/auth/sign-in-oidc.js'
import { clearCdpSession } from '#/server/routes/auth/clear-cdp-session.js'

export const signInOidcController = {
  handler: handleSignInOidc
}

export const signOutController = {
  handler(request, h) {
    clearCdpSession(request, h)

    const clearSessionUrl = config.get('eprPackaging.clearSessionUrl')
    if (clearSessionUrl) {
      return h.redirect(clearSessionUrl)
    }

    return h.redirect(appendLangQuery(paths.signedOut, getLocale(request)))
  }
}

export const clearSessionController = {
  handler(request, h) {
    clearCdpSession(request, h)

    const signInUrl = config.get('eprPackaging.signInUrl')
    if (signInUrl) {
      return h.redirect(signInUrl)
    }

    return h.redirect(appendLangQuery(paths.signedOut, getLocale(request)))
  }
}

export const signedOutController = {
  handler(_request, h) {
    return h.view('auth/signed-out/index')
  }
}
