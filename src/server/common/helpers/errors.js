import { paths } from '#/config/paths.js'
import { logAzureAdB2cAuthFailure } from '#/server/auth/azure-ad-b2c.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'

import { statusCodes } from '../constants/status-codes.js'

const errorPageKeys = {
  [statusCodes.badRequest]: {
    pageTitle: 'errorPages.400.pageTitle'
  },
  [statusCodes.unauthorized]: {
    pageTitle: 'errorPages.401.pageTitle'
  },
  [statusCodes.forbidden]: {
    pageTitle: 'errorPages.403.pageTitle',
    heading: 'errorPages.403.heading'
  },
  [statusCodes.notFound]: {
    pageTitle: 'errorPages.404.pageTitle',
    heading: 'errorPages.404.heading'
  },
  [statusCodes.internalServerError]: {
    pageTitle: 'errorPages.500.pageTitle',
    heading: 'errorPages.500.heading'
  }
}

function errorPage(statusCode, locale) {
  const normalisedStatusCode = Math.min(
    statusCode,
    statusCodes.internalServerError
  )
  const keys = errorPageKeys[normalisedStatusCode] ?? {
    pageTitle: 'errorPages.default.pageTitle'
  }
  const pageTitle = translate(locale, keys.pageTitle)

  return {
    pageTitle,
    heading: keys.heading ? translate(locale, keys.heading) : pageTitle,
    message: pageTitle,
    statusCode: normalisedStatusCode
  }
}

/**
 * Hapi's built-in not-found route skips cookie parsing and extensions (so
 * yar never loads the session), which would lose the user's chosen language
 * on the 404 page. Parse the cookies and load the session for that case.
 */
async function loadSessionForUnmatchedRoute(request) {
  if (!request.yar || request.yar.id) {
    return
  }

  try {
    if (request.state === null) {
      await request._parseCookies()
    }
    await request.yar._initialize()
  } catch {
    // Fall back to the default locale if the session cannot be loaded
  }
}

export async function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  await loadSessionForUnmatchedRoute(request)
  const locale = getLocale(request)
  const error = errorPage(statusCode, locale)

  if (request.path === paths.signInOidc) {
    logAzureAdB2cAuthFailure(request, response)
  }

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(response?.stack)
  }

  return h
    .view('error/index', {
      pageTitle: error.pageTitle,
      heading: error.heading,
      message: error.message,
      statusCode: error.statusCode
    })
    .code(statusCode)
}
