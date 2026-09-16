import { config } from '#/config/config.js'
import { getGa4CookieName } from '#/config/cookie-config.js'
import { paths, isSafeReturnPath } from '#/config/paths.js'
import { getBellAzureAdB2cCookieName } from '#/server/auth/azure-ad-b2c.js'
import { CSRF_COOKIE_NAME } from '#/server/plugins/crumb.js'
import { formatCookieTtl } from '#/server/common/helpers/format-cookie-ttl.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import {
  buildPageViewModel,
  translate
} from '#/server/common/helpers/i18n/translate.js'
import {
  getConsentCookieName,
  getCurrentPolicy,
  updatePolicy
} from '#/server/common/helpers/cookie-consent.js'

function tableHeaders(locale) {
  return [
    { text: translate(locale, 'cookies.table.name') },
    { text: translate(locale, 'cookies.table.purpose') },
    { text: translate(locale, 'cookies.table.expires') }
  ]
}

function cookieRow(name, purpose, expires) {
  return [
    {
      text: name,
      attributes: { scope: 'row' }
    },
    { text: purpose },
    { text: expires }
  ]
}

export function buildEssentialCookieTable(locale) {
  const sessionCookieName = config.get('session.cookie.name')
  const sessionCookieTtl = formatCookieTtl(config.get('session.cookie.ttl'))

  return {
    caption: translate(locale, 'cookies.table.essentialCookiesWeUse'),
    classes: 'cookies-table govuk-!-margin-bottom-4',
    head: tableHeaders(locale),
    rows: [
      cookieRow(
        sessionCookieName,
        translate(locale, 'cookies.session.purpose'),
        sessionCookieTtl
      ),
      cookieRow(
        CSRF_COOKIE_NAME,
        translate(locale, 'cookies.csrf.purpose'),
        translate(locale, 'cookies.oauthState.expires')
      ),
      cookieRow(
        getBellAzureAdB2cCookieName(),
        translate(locale, 'cookies.oauthState.purpose'),
        translate(locale, 'cookies.oauthState.expires')
      ),
      cookieRow(
        getConsentCookieName(),
        translate(locale, 'cookies.policy.purpose'),
        translate(locale, 'cookies.policy.expires')
      )
    ]
  }
}

export function buildAnalyticsCookieTable(locale) {
  return {
    caption: translate(locale, 'cookies.table.analyticsCookiesWeUse'),
    classes: 'cookies-table govuk-!-margin-bottom-4',
    head: tableHeaders(locale),
    rows: [
      cookieRow(
        '_ga',
        translate(locale, 'cookies.analytics.gaPurpose'),
        translate(locale, 'cookies.analytics.gaExpires')
      ),
      cookieRow(
        getGa4CookieName(config.get('googleAnalytics.measurementId')),
        translate(locale, 'cookies.analytics.gaContainerPurpose'),
        translate(locale, 'cookies.analytics.gaExpires')
      )
    ]
  }
}

export function buildAnalyticsRadios(locale, cookiesPolicy = {}) {
  return {
    idPrefix: 'analytics',
    name: 'analytics',
    fieldset: {
      legend: {
        text: translate(locale, 'cookies.settings.legend'),
        classes: 'govuk-fieldset__legend--s'
      }
    },
    items: [
      {
        value: true,
        text: translate(locale, 'cookies.settings.yes'),
        checked: Boolean(cookiesPolicy.analytics)
      },
      {
        value: false,
        text: translate(locale, 'cookies.settings.no'),
        checked: !cookiesPolicy.analytics
      }
    ]
  }
}

export function buildCookiesPageViewModel(request, h) {
  const locale = getLocale(request)
  const cookiesPolicy = getCurrentPolicy(request, h)

  return {
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
    analyticsCookiesHeading: translate(
      locale,
      'cookies.analyticsCookiesHeading'
    ),
    analyticsCookiesDescription1: translate(
      locale,
      'cookies.analyticsCookiesDescription1'
    ),
    analyticsCookiesDescription2: translate(
      locale,
      'cookies.analyticsCookiesDescription2'
    ),
    analyticsCookiesDescription3: translate(
      locale,
      'cookies.analyticsCookiesDescription3'
    ),
    analyticsCookiesPoints: [
      translate(locale, 'cookies.analyticsCookiesPoint1'),
      translate(locale, 'cookies.analyticsCookiesPoint2'),
      translate(locale, 'cookies.analyticsCookiesPoint3'),
      translate(locale, 'cookies.analyticsCookiesPoint4'),
      translate(locale, 'cookies.analyticsCookiesPoint5')
    ],
    analyticsCookiesPermission: translate(
      locale,
      'cookies.analyticsCookiesPermission'
    ),
    settingsHeading: translate(locale, 'cookies.settings.heading'),
    saveButtonText: translate(locale, 'cookies.settings.save'),
    successTitle: translate(locale, 'cookies.success.title'),
    successHeading: translate(locale, 'cookies.success.heading'),
    updated: request.query.updated === true,
    cookieTable: buildEssentialCookieTable(locale),
    analyticsCookieTable: buildAnalyticsCookieTable(locale),
    analyticsRadios: buildAnalyticsRadios(locale, cookiesPolicy)
  }
}

export const cookiesController = {
  handler(request, h) {
    return h.view('cookies/index', buildCookiesPageViewModel(request, h))
  }
}

export const cookiesPostController = {
  handler(request, h) {
    const payload = request.payload

    updatePolicy(request, h, payload.analytics)

    if (payload.async) {
      return h.response({ message: 'success' })
    }

    if (isSafeReturnPath(payload.returnUrl)) {
      return h.redirect(payload.returnUrl)
    }

    return h.redirect(`${paths.cookies}?updated=true`)
  }
}
