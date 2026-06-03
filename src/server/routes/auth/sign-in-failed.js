import { SIGN_IN_FAILED_HEADING_KEY } from '#/server/auth/constants.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'

export function renderSignInFailed(request, h, messageKey) {
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
