import { config } from '#/config/config.js'
import { BELL_AZURE_AD_B2C_COOKIE } from '#/server/auth/azure-ad-b2c.js'
import { formatCookieTtl } from '#/server/common/helpers/format-cookie-ttl.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import {
  buildPageViewModel,
  translate
} from '#/server/common/helpers/i18n/translate.js'

function buildCookieTable(locale) {
  const sessionCookieName = config.get('session.cookie.name')
  const sessionCookieTtl = formatCookieTtl(config.get('session.cookie.ttl'))

  return {
    caption: translate(locale, 'cookies.table.essentialCookiesWeUse'),
    classes: 'cookies-table govuk-!-margin-bottom-4',
    head: [
      { text: translate(locale, 'cookies.table.name') },
      { text: translate(locale, 'cookies.table.purpose') },
      { text: translate(locale, 'cookies.table.expires') }
    ],
    rows: [
      [
        {
          text: sessionCookieName,
          attributes: { scope: 'row' }
        },
        { text: translate(locale, 'cookies.session.purpose') },
        { text: sessionCookieTtl }
      ],
      [
        {
          text: BELL_AZURE_AD_B2C_COOKIE,
          attributes: { scope: 'row' }
        },
        { text: translate(locale, 'cookies.oauthState.purpose') },
        { text: translate(locale, 'cookies.oauthState.expires') }
      ]
    ]
  }
}

export const cookiesController = {
  handler(request, h) {
    const locale = getLocale(request)

    return h.view('cookies/index', {
      ...buildPageViewModel(request, 'cookies'),
      introParagraph: translate(locale, 'cookies.introParagraph'),
      introParagraph2: translate(locale, 'cookies.introParagraph2'),
      essentialCookiesHeading: translate(
        locale,
        'cookies.essentialCookiesHeading'
      ),
      essentialCookiesDescription: translate(
        locale,
        'cookies.essentialCookiesDescription'
      ),
      cookieTable: buildCookieTable(locale)
    })
  }
}
