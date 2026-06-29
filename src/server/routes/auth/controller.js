import { config } from '#/config/config.js'
import { paths } from '#/config/paths.js'
import {
  BELL_AZURE_AD_B2C_COOKIE,
  buildB2cLogoutUrl,
  getB2cAuthorityPrefix,
  resolvePostLogoutAbsoluteUri,
  shouldApplyPostLogoutRedirectUri
} from '#/server/auth/azure-ad-b2c.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { handleSignInOidc } from '#/server/routes/auth/sign-in-oidc.js'

export const signInOidcController = {
  handler: handleSignInOidc
}

export const signOutController = {
  handler(request, h) {
    if (request.yar) {
      request.yar.reset()
    }
    h.unstate(BELL_AZURE_AD_B2C_COOKIE)

    const azure = config.get('auth.azureAdB2c')
    const prefix = getB2cAuthorityPrefix(azure)
    const pathOrUrl =
      config.get('eprPackaging.signOutUrl') ||
      azure.postLogoutRedirectPath ||
      paths.signedOut
    const configuredPostLogoutUri = resolvePostLogoutAbsoluteUri(
      request,
      pathOrUrl,
      azure
    )
    const postLogoutUri = shouldApplyPostLogoutRedirectUri(
      request,
      configuredPostLogoutUri
    )
      ? configuredPostLogoutUri
      : resolvePostLogoutAbsoluteUri(request, paths.signedOut, azure)

    if (!prefix) {
      return h.redirect(appendLangQuery(paths.signedOut, getLocale(request)))
    }

    return h.redirect(buildB2cLogoutUrl(prefix, postLogoutUri))
  }
}

export const signedOutController = {
  handler(_request, h) {
    return h.view('auth/signed-out/index')
  }
}
