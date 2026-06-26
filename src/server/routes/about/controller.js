/**
 * A GDS styled example about page controller.
 * Provided as an example, remove or modify as required.
 */
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'

export const aboutController = {
  handler(request, h) {
    const locale = getLocale(request)
    const heading = translate(locale, 'about.heading')

    return h.view('about/index', {
      pageTitle: translate(locale, 'about.pageTitle'),
      heading
    })
  }
}
