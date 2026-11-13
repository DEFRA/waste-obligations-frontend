import Boom from '@hapi/boom'

import { statusCodes } from '../constants/status-codes.js'
import { getLocale } from './i18n/get-locale.js'
import { translate } from './i18n/translate.js'

const BAD_REQUEST_PAGE_TITLE_KEY = 'errorPages.400.pageTitle'

export function renderValidationFailAction(request, h, error) {
  // A malformed id in the address (such as an organisation, scheme or PRN id
  // that is not a GUID) names a page that does not exist, so it gets Page not
  // found. Other failures, such as a bad query value, still get Bad Request.
  if (error?.output?.payload?.validation?.source === 'params') {
    throw Boom.notFound()
  }

  const locale = getLocale(request)
  const pageTitle = translate(locale, BAD_REQUEST_PAGE_TITLE_KEY)

  return h
    .view('error/index', {
      pageTitle,
      heading: pageTitle,
      message: pageTitle,
      statusCode: statusCodes.badRequest
    })
    .code(statusCodes.badRequest)
    .takeover()
}
