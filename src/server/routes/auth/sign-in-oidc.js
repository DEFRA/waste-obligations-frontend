import { Buffer } from 'node:buffer'

import { paths, isSafeReturnPath } from '#/config/paths.js'
import {
  SIGN_IN_FAILED_ACCOUNT_SERVICE_ERROR_MESSAGE_KEY,
  SIGN_IN_FAILED_INVALID_SERVICE_MESSAGE_KEY,
  SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY,
  SIGN_IN_FAILED_NO_USER_ID_MESSAGE_KEY,
  SIGN_IN_FAILED_USER_NOT_FOUND_MESSAGE_KEY
} from '#/server/auth/constants.js'
import { BELL_AZURE_AD_B2C_COOKIE } from '#/server/auth/azure-ad-b2c.js'
import { isEligibleForObligationsLogin } from '#/server/auth/user-organisations-validation.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import {
  appendLangQuery,
  clearAuthLocale
} from '#/server/common/helpers/i18n/locale-url.js'
import { renderSignInFailed } from '#/server/routes/auth/sign-in-failed.js'

function handleB2cCallbackError(request, h) {
  clearAuthLocale(request)

  request.logger.warn(
    {
      b2cError: request.query.error,
      b2cErrorDescription: request.query.error_description,
      b2cErrorCode: request.query.error_codes
    },
    'Azure AD B2C returned an error to the sign-in callback'
  )

  h.unstate(BELL_AZURE_AD_B2C_COOKIE)

  return renderSignInFailed(
    request,
    h,
    SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY
  )
}

function getUserIdFromProfile(profile) {
  return profile?.sub || profile?.oid || null
}

function formatInternalError(error) {
  const internalError = error.cause ?? error
  return [
    internalError.code && `code=${internalError.code}`,
    internalError.errno && `errno=${internalError.errno}`,
    internalError.syscall && `syscall=${internalError.syscall}`,
    internalError.address && `address=${internalError.address}`,
    internalError.port && `port=${internalError.port}`,
    internalError.reason && `reason=${internalError.reason}`
  ]
    .filter(Boolean)
    .join(' ')
}

function formatErrorData(error) {
  if (error.data === undefined || error.data === null) {
    return 'none'
  }

  const data =
    Buffer.isBuffer(error.data) || typeof error.data === 'string'
      ? error.data.toString()
      : JSON.stringify(error.data)

  return data.replace(/\s+/g, ' ').slice(0, 1000)
}

function logAuthError(request) {
  const error = request.auth?.error

  if (!error) {
    return
  }

  const internalError = formatInternalError(error)

  request.logger.warn(
    `Azure AD B2C authentication error: isAuthenticated=${Boolean(request.auth?.isAuthenticated)} errorName=${error.name} statusCode=${error.output?.statusCode} message=${error.message} internalError=${internalError || 'none'} errorData=${formatErrorData(error)}`
  )
}

async function loadUserOrganisations(request, userId) {
  return request.server.app.backendAccountApi.getUserOrganisations(userId)
}

function validateSignInEligibility(request, h, userOrganisations, userId) {
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

  if (!isEligibleForObligationsLogin(userOrganisations)) {
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

  return null
}

function redirectAfterSignIn(request, h) {
  const locale = getLocale(request)
  clearAuthLocale(request)

  const returnUrl = request.yar.get('authReturnUrl')
  request.yar.clear('authReturnUrl')

  const redirectPath =
    returnUrl && isSafeReturnPath(returnUrl) ? returnUrl : paths.home

  return h.redirect(appendLangQuery(redirectPath, locale))
}

export async function handleSignInOidc(request, h) {
  if (request.query?.error) {
    return handleB2cCallbackError(request, h)
  }

  logAuthError(request)

  if (!request.auth?.credentials) {
    request.logger.warn('Azure AD B2C sign-in completed without credentials')
    return renderSignInFailed(
      request,
      h,
      SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY
    )
  }

  const userId = getUserIdFromProfile(request.auth.credentials.profile)

  if (!userId) {
    request.logger.warn(
      'Azure AD B2C sign-in completed without a user identifier in the token'
    )
    return renderSignInFailed(request, h, SIGN_IN_FAILED_NO_USER_ID_MESSAGE_KEY)
  }

  let userOrganisations
  try {
    userOrganisations = await loadUserOrganisations(request, userId)
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

  const eligibilityFailure = validateSignInEligibility(
    request,
    h,
    userOrganisations,
    userId
  )
  if (eligibilityFailure) {
    return eligibilityFailure
  }

  request.yar.set('credentials', request.auth.credentials)
  request.yar.set('user', userOrganisations.user)

  return redirectAfterSignIn(request, h)
}
