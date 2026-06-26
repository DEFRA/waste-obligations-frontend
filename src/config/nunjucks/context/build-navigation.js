import { config } from '../../config.js'
import { paths } from '../../paths.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'

function isAuthenticated(request) {
  try {
    return Boolean(request?.yar?.get('credentials'))
  } catch {
    // Session may be unavailable during error handling
    return false
  }
}

export function buildNavigation(request) {
  const locale = getLocale(request)
  const path = request?.path ?? ''

  if (!isAuthenticated(request)) {
    return [
      {
        text: translate(locale, 'common.nav.signIn'),
        href: appendLangQuery(paths.signInOidc, locale)
      }
    ]
  }

  return [
    {
      text: translate(locale, 'common.nav.home'),
      href: config.get('eprPackaging.homeUrl'),
      active: path === '/'
    },
    {
      text: translate(locale, 'common.nav.manageAccount'),
      href: config.get('eprPackaging.manageAccountUrl')
    },
    {
      text: translate(locale, 'common.nav.signOut'),
      href: appendLangQuery(paths.signOut, locale)
    }
  ]
}
