import { config } from '#/config/config.js'
import { paths, isSafeReturnPath } from '#/config/paths.js'
import {
  EPR_PACKAGING_SERVICE_NAME,
  EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
  SIGN_IN_FAILED_HEADING_KEY,
  SIGN_IN_FAILED_ACCOUNT_SERVICE_ERROR_MESSAGE_KEY,
  SIGN_IN_FAILED_INVALID_SERVICE_MESSAGE_KEY,
  SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY,
  SIGN_IN_FAILED_NO_USER_ID_MESSAGE_KEY,
  SIGN_IN_FAILED_USER_NOT_FOUND_MESSAGE_KEY
} from '#/server/auth/constants.js'
import {
  BELL_AZURE_AD_B2C_COOKIE,
  buildB2cLogoutUrl,
  getB2cAuthorityPrefix,
  resolvePostLogoutAbsoluteUri
} from '#/server/auth/azure-ad-b2c.js'
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
  async handler(request, h) {
    // When Azure AD B2C returns an error to the redirect_uri, avoid redirect loops and log details.
    if (request.query?.error) {
      clearAuthLocale(request)

      request.logger.warn(
        {
          b2cError: request.query.error,
          b2cErrorDescription: request.query.error_description,
          b2cErrorCode: request.query.error_codes
        },
        'Azure AD B2C returned an error to the sign-in callback'
      )

      // Clear Bell state cookie in case it contributes to repeated retries.
      h.unstate(BELL_AZURE_AD_B2C_COOKIE)

      return renderSignInFailed(
        request,
        h,
        SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY
      )
    }

    if (!request.auth?.credentials) {
      request.logger.warn('Azure AD B2C sign-in completed without credentials')
      return renderSignInFailed(
        request,
        h,
        SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY
      )
    }

    const profile = request.auth.credentials.profile
    const userId = profile?.sub || profile?.oid || null

    if (!userId) {
      request.logger.warn(
        'Azure AD B2C sign-in completed without a user identifier in the token'
      )
      return renderSignInFailed(
        request,
        h,
        SIGN_IN_FAILED_NO_USER_ID_MESSAGE_KEY
      )
    }

    let userOrganisations
    try {
      userOrganisations =
        await request.server.app.backendAccountApi.getUserOrganisations(
          userId,
          request.app.traceId
        )
    } catch (error) {
      request.logger.warn(
        { err: error, userId },
        'Failed to load user organisations from account service'
      )
      return renderSignInFailed(
        request,
        h,
        SIGN_IN_FAILED_ACCOUNT_SERVICE_ERROR_MESSAGE_KEY
      )
    }

    if (!userOrganisations?.user) {
      request.logger.info(
        { userId },
        'User authenticated in B2C but not found in account service'
      )
      return renderSignInFailed(
        request,
        h,
        SIGN_IN_FAILED_USER_NOT_FOUND_MESSAGE_KEY
      )
    }

    const isEligibleForObligationsLogin =
      userOrganisations?.user != null &&
      userOrganisations.user.service === EPR_PACKAGING_SERVICE_NAME &&
      userOrganisations.user.serviceRole ===
        EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE

    if (!isEligibleForObligationsLogin) {
      request.logger.info(
        { userId, service: userOrganisations.user.service },
        'User is not registered for the EPR Packaging service'
      )
      return renderSignInFailed(
        request,
        h,
        SIGN_IN_FAILED_INVALID_SERVICE_MESSAGE_KEY
      )
    }

    request.yar.set('credentials', request.auth.credentials)
    request.yar.set('user', userOrganisations.user)

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
