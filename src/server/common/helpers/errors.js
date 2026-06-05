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
    pageTitle: 'errorPages.403.pageTitle'
  },
  [statusCodes.notFound]: {
    pageTitle: 'errorPages.404.pageTitle',
    heading: 'errorPages.404.heading'
  },
  [statusCodes.internalServerError]: {
    pageTitle: 'errorPages.500.pageTitle'
  }
}

function errorPage(statusCode, locale) {
  const keys = errorPageKeys[statusCode] ?? {
    pageTitle: 'errorPages.default.pageTitle'
  }
  const pageTitle = translate(locale, keys.pageTitle)

  return {
    pageTitle,
    heading: keys.heading ? translate(locale, keys.heading) : statusCode,
    message: pageTitle
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

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(response?.stack)
  }

  return h
    .view('error/index', {
      pageTitle: error.pageTitle,
      heading: error.heading,
      message: error.message,
      statusCode
    })
    .code(statusCode)
}
