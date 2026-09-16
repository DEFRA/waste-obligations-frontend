import { config } from '#/config/config.js'

const GOOGLE_ANALYTICS_COOKIE_PATTERN =
  /^_ga$|^_ga_.*$|^_gid$|^_gat_.*$|^_dc_gtm_.*$/

export function getConsentCookieName() {
  return config.get('cookiePolicy.name')
}

export function getConsentCookieOptions() {
  return {
    clearInvalid: true,
    encoding: 'base64json',
    isHttpOnly: false,
    isSameSite: 'Lax',
    isSecure: config.get('session.cookie.secure'),
    ttl: config.get('cookiePolicy.ttl')
  }
}

export function createDefaultPolicy() {
  return { confirmed: false, essential: true, analytics: false }
}

export function getCurrentPolicy(request, h) {
  let cookiesPolicy = request.state?.[getConsentCookieName()]

  if (!cookiesPolicy) {
    cookiesPolicy = createDefaultPolicy()
    h.state(getConsentCookieName(), cookiesPolicy, getConsentCookieOptions())
  }

  return cookiesPolicy
}

export function updatePolicy(request, h, analytics) {
  const cookiesPolicy = getCurrentPolicy(request, h)

  cookiesPolicy.analytics = analytics
  cookiesPolicy.confirmed = true

  h.state(getConsentCookieName(), cookiesPolicy, getConsentCookieOptions())

  if (!analytics) {
    removeAnalytics(request, h)
  }
}

export function removeAnalytics(request, h) {
  for (const cookieName of Object.keys(request.state ?? {})) {
    if (GOOGLE_ANALYTICS_COOKIE_PATTERN.test(cookieName)) {
      h.unstate(cookieName)
    }
  }
}
