import { statusCodes } from '../constants/status-codes.js'
import { getLocale } from './i18n/get-locale.js'
import { translate } from './i18n/translate.js'

const BAD_REQUEST_PAGE_TITLE_KEY = 'errorPages.400.pageTitle'

export function renderValidationFailAction(request, h, _error) {
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
