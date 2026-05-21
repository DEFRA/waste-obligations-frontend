import { config } from '#/config/config.js'
import { paths, isSafeReturnPath } from '#/config/paths.js'
import {
  SIGN_IN_FAILED_HEADING_KEY,
  SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY,
  SIGN_IN_FAILED_NO_USER_ID_MESSAGE_KEY
} from '#/server/auth/constants.js'
import {
  BELL_AZURE_AD_B2C_COOKIE,
  buildB2cLogoutUrl,
  getB2cAuthorityPrefix,
  resolvePostLogoutAbsoluteUri
} from '#/server/auth/azure-ad-b2c.js'
import {
  getUserIdFromRequest,
  setUserFromCredentials
} from '#/server/auth/user-session.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import {
  appendLangQuery,
  clearAuthLocale
} from '#/server/common/helpers/i18n/locale-url.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'

function renderSignInFailed(request, h, messageKey) {
  const locale = getLocale(request)
  const heading = translate(locale, SIGN_IN_FAILED_HEADING_KEY)

  return h
    .view('error/index', {
      pageTitle: heading,
      heading,
      message: translate(locale, messageKey)
    })
    .code(statusCodes.unauthorized)
}

export const signInOidcController = {
  handler(request, h) {
    if (!request.auth?.credentials) {
      request.logger.warn('Azure AD B2C sign-in completed without credentials')
      return renderSignInFailed(
        request,
        h,
        SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY
      )
    }

    setUserFromCredentials(request, request.auth.credentials)

    if (!getUserIdFromRequest(request)) {
      request.logger.warn(
        'Azure AD B2C sign-in completed without a user identifier in the token'
      )
      return renderSignInFailed(
        request,
        h,
        SIGN_IN_FAILED_NO_USER_ID_MESSAGE_KEY
      )
    }

    const locale = getLocale(request)
    clearAuthLocale(request)

    const returnUrl = request.yar.get('authReturnUrl')
    request.yar.clear('authReturnUrl')

    const redirectPath =
      returnUrl && isSafeReturnPath(returnUrl) ? returnUrl : paths.home

    return h.redirect(appendLangQuery(redirectPath, locale))
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
