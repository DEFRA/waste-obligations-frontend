import { statusCodes } from '../constants/status-codes.js'
import { getLocale } from './i18n/get-locale.js'
import { translate } from './i18n/translate.js'

function resolveMessageToken(token, locale) {
  if (typeof token !== 'string' || token.length === 0) {
    return token
  }

  const translated = translate(locale, token)
  return translated === token ? token : translated
}

export function renderValidationFailAction(request, h, error) {
  const locale = getLocale(request)
  const message =
    error?.details
      ?.map((detail) => resolveMessageToken(detail?.message, locale))
      .filter((value) => typeof value === 'string' && value.length > 0)
      .join(', ') ||
    resolveMessageToken(error?.message, locale) ||
    translate(locale, 'common.validation.badRequest')

  return h
    .view('error/index', {
      pageTitle: translate(locale, 'common.validation.badRequest'),
      heading: statusCodes.badRequest,
      message
    })
    .code(statusCodes.badRequest)
    .takeover()
}
