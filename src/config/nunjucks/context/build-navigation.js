import { config } from '../../config.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'

export function buildNavigation(request) {
  const locale = getLocale(request)
  const path = request?.path ?? ''

  return [
    {
      text: translate(locale, 'compliance.common.nav.home'),
      href: config.get('eprPackaging.homeUrl'),
      active: path === '/'
    },
    {
      text: translate(locale, 'compliance.common.nav.manageAccount'),
      href: config.get('eprPackaging.manageAccountUrl')
    },
    {
      text: translate(locale, 'compliance.common.nav.signOut'),
      href: config.get('eprPackaging.signOutUrl')
    }
  ]
}
