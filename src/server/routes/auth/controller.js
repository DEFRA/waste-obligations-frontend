import { config } from '#/config/config.js'
import { paths, isSafeReturnPath } from '#/config/paths.js'
import {
  BELL_AZURE_AD_B2C_COOKIE,
  buildB2cLogoutUrl,
  getB2cAuthorityPrefix,
  resolvePostLogoutAbsoluteUri
} from '#/server/auth/azure-ad-b2c.js'
import { setUserFromCredentials } from '#/server/auth/user-session.js'

export const signinOidcController = {
  handler(request, h) {
    if (request.auth?.credentials) {
      setUserFromCredentials(request, request.auth.credentials)
    }

    const returnUrl = request.yar.get('authReturnUrl')
    request.yar.clear('authReturnUrl')

    const redirectPath =
      returnUrl && isSafeReturnPath(returnUrl) ? returnUrl : paths.home

    return h.redirect(redirectPath)
  }
}

export const signOutController = {
  handler(request, h) {
    if (request.yar) {
      request.yar.reset()
    }
    h.unstate(BELL_AZURE_AD_B2C_COOKIE)

    const azure = config.get('auth.azureAdB2c')
    const prefix = getB2cAuthorityPrefix(azure)
    const pathOrUrl = azure.postLogoutRedirectPath || paths.signedOut
    const postLogoutUri = resolvePostLogoutAbsoluteUri(
      request,
      pathOrUrl,
      azure
    )

    if (!prefix) {
      return h.redirect(paths.signedOut)
    }

    return h.redirect(buildB2cLogoutUrl(prefix, postLogoutUri))
  }
}

export const signedOutController = {
  handler(request, h) {
    return h.view('auth/signed-out/index', {
      pageTitle: 'Signed out',
      heading: 'Signed out',
      message: 'You have signed out of the obligations service.'
    })
  }
}
