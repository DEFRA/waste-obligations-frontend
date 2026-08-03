import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'

export const homeController = {
  handler(request, h) {
    const locale = getLocale(request)
    const heading = translate(locale, 'common.nav.home')

    return h.view('home/index', {
      pageTitle: heading,
      heading
    })
  }
}
