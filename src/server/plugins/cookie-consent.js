import {
  getConsentCookieName,
  getConsentCookieOptions,
  getCurrentPolicy,
  isGoogleAnalyticsEnabled,
  removeAnalytics
} from '#/server/common/helpers/cookie-consent.js'

export function applyCookieConsentToView(request, h) {
  const response = request.response

  if (response.variety !== 'view' || !response.source) {
    return h.continue
  }

  response.header('cache-control', 'no-store')

  if (!response.source.context) {
    response.source.context = {}
  }

  response.source.context.currentPath = `${request.path}${request.url.search ?? ''}`

  if (!isGoogleAnalyticsEnabled()) {
    removeAnalytics(request, h)

    return h.continue
  }

  const cookiesPolicy = getCurrentPolicy(request, h)

  response.source.context.cookiesPolicy = cookiesPolicy

  if (cookiesPolicy.confirmed && !cookiesPolicy.analytics) {
    removeAnalytics(request, h)
  }

  return h.continue
}

export const cookieConsent = {
  plugin: {
    name: 'cookie-consent',
    register(server) {
      server.state(getConsentCookieName(), getConsentCookieOptions())
    }
  }
}
