import { config } from '#/config/config.js'
import {
  CONSENT_COOKIE_NAME,
  isAnalyticsConfigured,
  isGoogleAnalyticsCookie
} from '#/config/cookie-config.js'

export const GOOGLE_ANALYTICS_UNSTATE_OPTIONS = {
  path: '/',
  ignoreForwardedPrefix: true
}

export function isGoogleAnalyticsEnabled() {
  return isAnalyticsConfigured(
    config.get('googleAnalytics.googleTagManagerKey'),
    config.get('googleAnalytics.measurementId')
  )
}

export function getConsentCookieName() {
  return config.get('cookiePolicy.name') || CONSENT_COOKIE_NAME
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
  const name = getConsentCookieName()
  let cookiesPolicy = request.state?.[name]

  if (!cookiesPolicy) {
    cookiesPolicy = createDefaultPolicy()

    if (request.state) {
      request.state[name] = cookiesPolicy
    }

    h.state(name, cookiesPolicy, getConsentCookieOptions())
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

function cookieNamesFromHeader(cookieHeader) {
  if (typeof cookieHeader !== 'string' || cookieHeader.length === 0) {
    return []
  }

  return cookieHeader
    .split(';')
    .map((part) => part.split('=')[0]?.trim())
    .filter(Boolean)
}

function googleAnalyticsCookieNames(request) {
  const names = new Set()

  for (const name of Object.keys(request.state ?? {})) {
    names.add(name)
  }

  for (const name of cookieNamesFromHeader(request.headers?.cookie)) {
    names.add(name)
  }

  return [...names].filter((name) => isGoogleAnalyticsCookie(name))
}

export function removeAnalytics(request, h) {
  for (const cookieName of googleAnalyticsCookieNames(request)) {
    h.unstate(cookieName, GOOGLE_ANALYTICS_UNSTATE_OPTIONS)
  }
}
