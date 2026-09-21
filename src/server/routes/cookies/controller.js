import { config } from '#/config/config.js'
import { getGa4CookieName, getGa4TagId } from '#/config/cookie-config.js'
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
  isGoogleAnalyticsEnabled,
  updatePolicy
} from '#/server/common/helpers/cookie-consent.js'

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const GOOGLE_ANALYTICS_GID_TTL_MS =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND

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

export function buildEssentialCookieTable(
  locale,
  { includeConsentCookie = true } = {}
) {
  const sessionCookieName = config.get('session.cookie.name')
  const sessionCookieTtl = formatCookieTtl(
    config.get('session.cookie.ttl'),
    locale
  )
  const rows = [
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
    )
  ]

  if (includeConsentCookie) {
    rows.push(
      cookieRow(
        getConsentCookieName(),
        translate(locale, 'cookies.policy.purpose'),
        formatCookieTtl(config.get('cookiePolicy.ttl'), locale)
      )
    )
  }

  return {
    caption: translate(locale, 'cookies.table.essentialCookiesWeUse'),
    classes: 'cookies-table govuk-!-margin-bottom-4',
    head: tableHeaders(locale),
    rows
  }
}

export function buildAnalyticsCookieTable(locale) {
  const rows = [
    cookieRow(
      '_ga',
      translate(locale, 'cookies.analytics.gaPurpose'),
      translate(locale, 'cookies.analytics.gaExpires')
    ),
    cookieRow(
      '_gid',
      translate(locale, 'cookies.analytics.gidPurpose'),
      formatCookieTtl(GOOGLE_ANALYTICS_GID_TTL_MS, locale)
    )
  ]
  const measurementId = config.get('googleAnalytics.measurementId')

  if (getGa4TagId(measurementId)) {
    rows.push(
      cookieRow(
        getGa4CookieName(measurementId),
        translate(locale, 'cookies.analytics.gaContainerPurpose'),
        translate(locale, 'cookies.analytics.gaExpires')
      )
    )
  }

  return {
    caption: translate(locale, 'cookies.table.analyticsCookiesWeUse'),
    classes: 'cookies-table govuk-!-margin-bottom-4',
    head: tableHeaders(locale),
    rows
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

export function buildCookiesPageViewModel(request) {
  const locale = getLocale(request)
  const analyticsEnabled = isGoogleAnalyticsEnabled()
  const cookiesPolicy = analyticsEnabled ? getCurrentPolicy(request) : undefined

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
    cookieTable: buildEssentialCookieTable(locale, {
      includeConsentCookie: analyticsEnabled
    }),
    analyticsCookieTable: analyticsEnabled
      ? buildAnalyticsCookieTable(locale)
      : undefined,
    analyticsRadios: analyticsEnabled
      ? buildAnalyticsRadios(locale, cookiesPolicy)
      : undefined
  }
}

export const cookiesController = {
  handler(request, h) {
    return h.view('cookies/index', buildCookiesPageViewModel(request))
  }
}

export const cookiesPostController = {
  handler(request, h) {
    const payload = request.payload

    if (isGoogleAnalyticsEnabled()) {
      updatePolicy(request, h, payload.analytics)
    }

    if (payload.async) {
      return h.response({ message: 'success' })
    }

    if (isSafeReturnPath(payload.returnUrl)) {
      return h.redirect(payload.returnUrl)
    }

    return h.redirect(`${paths.cookies}?updated=true`)
  }
}
