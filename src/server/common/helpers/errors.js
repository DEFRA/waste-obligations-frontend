import { config } from '#/config/config.js'
import { paths } from '#/config/paths.js'
import { logAzureAdB2cAuthFailure } from '#/server/auth/azure-ad-b2c.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import {
  logApplicationError,
  wasApplicationErrorLogged
} from '#/server/common/helpers/logging/application-error.js'
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

const MAX_LOGGED_STACK_FRAMES = 10

// Error name and stack frames only: the message text is left out because it
// can carry personal data.
function safeErrorContext(error) {
  const stackFrames = String(error?.stack ?? '')
    .split('\n')
    .filter((line) => /^\s+at /.test(line))
    .slice(0, MAX_LOGGED_STACK_FRAMES)
    .map((line) => line.trim())

  return { errorName: error?.name, stackFrames }
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

export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  const statusCode = response.output.statusCode
  const locale = getLocale(request)
  const error = errorPage(statusCode, locale)

  if (request.path === paths.signInOidc) {
    logAzureAdB2cAuthFailure(request, response)
  }

  // Failures already logged by API middleware are not logged again here.
  if (
    statusCode >= statusCodes.internalServerError &&
    !wasApplicationErrorLogged(response)
  ) {
    logApplicationError(
      request.logger,
      'error',
      response,
      `Server error response: statusCode=${statusCode}, method=${request.method?.toUpperCase()}, path=${request.path}`,
      safeErrorContext(response)
    )
  }

  return h
    .view('error/index', {
      pageTitle: error.pageTitle,
      heading: error.heading,
      message: error.message,
      statusCode: error.statusCode,
      homeUrl: appendLangQuery(config.get('eprPackaging.homeUrl'), locale)
    })
    .code(statusCode)
}
