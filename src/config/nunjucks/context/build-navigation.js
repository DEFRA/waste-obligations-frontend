import { config } from '../../config.js'
import { paths } from '../../paths.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'

function isAuthenticated(request) {
  try {
    return Boolean(request?.yar?.get('credentials'))
  } catch {
    // Session may be unavailable during error handling
    return false
  }
}

// The same page on another frontend behind the reverse proxy, for trying a
// shared sign-in by hand. Only shown when that frontend's path is configured.
function otherFrontendLinks(request) {
  const { path, name } = config.get('sharedAuth.otherFrontend')
  if (!path) {
    return []
  }

  const query = new URLSearchParams(request.query ?? {}).toString()
  return [
    {
      text: `Open in ${name}`,
      href: `${path.replace(/\/$/, '')}${request.path}${query ? `?${query}` : ''}`
    }
  ]
}

export function buildNavigation(request) {
  const locale = getLocale(request)

  if (!isAuthenticated(request)) {
    return [
      ...otherFrontendLinks(request),
      {
        text: translate(locale, 'common.nav.signIn'),
        href: withForwardedPrefix(
          request,
          appendLangQuery(paths.signInOidc, locale)
        )
      }
    ]
  }

  return [
    {
      text: translate(locale, 'common.nav.home'),
      href: config.get('eprPackaging.homeUrl')
    },
    {
      text: translate(locale, 'common.nav.manageAccount'),
      href: config.get('eprPackaging.manageAccountUrl')
    },
    ...otherFrontendLinks(request),
    {
      text: translate(locale, 'common.nav.signOut'),
      href: withForwardedPrefix(request, appendLangQuery(paths.signOut, locale))
    }
  ]
}
