import { config } from '#/config/config.js'
import { paths } from '#/config/paths.js'
import {
  buildB2cLogoutUrl,
  getB2cAuthorityPrefix,
  resolvePostLogoutAbsoluteUri
} from '#/server/auth/azure-ad-b2c.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { handleSignInOidc } from '#/server/routes/auth/sign-in-oidc.js'
import { clearCdpSession } from '#/server/routes/auth/clear-cdp-session.js'

function isHttpUrl(url) {
  return url.protocol === 'http:' || url.protocol === 'https:'
}

/**
 * The Packaging clear-session endpoint is browser-facing, so it must be on
 * the same public origin and path base as the configured Packaging home.
 *
 * @param {string | undefined} clearSessionUrl
 * @returns {boolean}
 */
function isPackagingClearSessionUrl(clearSessionUrl) {
  const packagingHomeUrl = config.get('eprPackaging.homeUrl')

  try {
    const clearSession = new URL(clearSessionUrl)
    const packagingHome = new URL(packagingHomeUrl)
    const packagingPath = packagingHome.pathname.replace(/\/$/, '')
    const expectedPath = `${packagingPath}/Account/ClearSession`

    return (
      isHttpUrl(clearSession) &&
      isHttpUrl(packagingHome) &&
      !clearSession.username &&
      !clearSession.password &&
      clearSession.origin === packagingHome.origin &&
      clearSession.pathname === expectedPath &&
      !clearSession.search &&
      !clearSession.hash
    )
  } catch {
    return false
  }
}

function redirectToLocalB2cSignOut(request, h) {
  const azureAdB2c = config.get('auth.azureAdB2c')
  const authorityPrefix = getB2cAuthorityPrefix(azureAdB2c)

  if (!authorityPrefix) {
    return h.redirect(appendLangQuery(paths.signedOut, getLocale(request)))
  }

  const postLogoutUri = resolvePostLogoutAbsoluteUri(
    request,
    azureAdB2c?.postLogoutRedirectPath || paths.signedOut
  )

  return h.redirect(buildB2cLogoutUrl(authorityPrefix, postLogoutUri))
}

export const signInOidcController = {
  handler: handleSignInOidc
}

export const signOutController = {
  handler(request, h) {
    clearCdpSession(request, h)

    const clearSessionUrl = config.get('eprPackaging.clearSessionUrl')
    if (isPackagingClearSessionUrl(clearSessionUrl)) {
      return h.redirect(clearSessionUrl)
    }

    request.logger.warn(
      'EPR Packaging clear-session URL is invalid; signing out directly from Azure AD B2C instead'
    )

    return redirectToLocalB2cSignOut(request, h)
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
