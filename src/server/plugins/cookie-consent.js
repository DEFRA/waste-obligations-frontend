import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  getConsentCookieName,
  getConsentCookieOptions,
  getCurrentPolicy,
  removeAnalytics
} from '#/server/common/helpers/cookie-consent.js'

export function applyCookieConsentToView(request, h) {
  const response = request.response

  if (response.variety !== 'view' || !response.source) {
    return h.continue
  }

  if (response.statusCode === statusCodes.forbidden) {
    return h.continue
  }

  response.header('cache-control', 'no-store')

  if (!response.source.context) {
    response.source.context = {}
  }

  const cookiesPolicy = getCurrentPolicy(request, h)

  response.source.context.cookiesPolicy = cookiesPolicy
  response.source.context.currentPath = `${request.path}${request.url.search ?? ''}`

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
