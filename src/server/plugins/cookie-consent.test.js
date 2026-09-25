import { describe, expect, test, vi } from 'vitest'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { applyCookieConsentToView } from './cookie-consent.js'

function createViewRequest({
  statusCode = statusCodes.ok,
  context = {},
  path = '/cookies',
  search = '',
  state = {},
  headers = {}
} = {}) {
  return {
    path,
    url: { search },
    state,
    headers,
    response: {
      variety: 'view',
      statusCode,
      source: { context },
      header: vi.fn()
    }
  }
}

describe('applyCookieConsentToView', () => {
  test('ignores non-view responses', () => {
    const h = { continue: Symbol('continue') }
    const result = applyCookieConsentToView(
      { response: { variety: 'plain' } },
      h
    )

    expect(result).toBe(h.continue)
  })

  test('ignores view responses without a source', () => {
    const h = { continue: Symbol('continue') }
    const result = applyCookieConsentToView(
      { response: { variety: 'view', source: null } },
      h
    )

    expect(result).toBe(h.continue)
  })

  test('applies cookie consent to forbidden view responses', () => {
    const previousKey = config.get('googleAnalytics.googleTagManagerKey')
    config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
    const request = createViewRequest({
      statusCode: statusCodes.forbidden,
      path: '/producer/unauthorised/obligations',
      state: {
        waste_obligations_cookie_policy: {
          confirmed: true,
          essential: true,
          analytics: true
        },
        _ga: 'GA1.1.1'
      }
    })
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    try {
      applyCookieConsentToView(request, h)

      expect(request.response.header).toHaveBeenCalledWith(
        'cache-control',
        'no-store'
      )
      expect(request.response.source.context.cookiesPolicy).toEqual({
        confirmed: true,
        essential: true,
        analytics: true
      })
      expect(h.unstate).not.toHaveBeenCalled()
    } finally {
      config.set('googleAnalytics.googleTagManagerKey', previousKey)
    }
  })

  test('does not set a consent cookie when analytics is not configured', () => {
    const request = createViewRequest({
      path: '/signed-out',
      search: '?lang=cy'
    })
    request.response.source.context = undefined
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    const result = applyCookieConsentToView(request, h)

    expect(request.response.source.context.cookiesPolicy).toBeUndefined()
    expect(request.response.source.context.currentPath).toBe(
      '/signed-out?lang=cy'
    )
    expect(h.state).not.toHaveBeenCalled()
    expect(h.unstate).not.toHaveBeenCalled()
    expect(request.response.header).not.toHaveBeenCalled()
    expect(result).toBe(h.continue)
  })

  test('expires GA cookies when analytics is not configured', () => {
    const request = createViewRequest({
      state: { _ga: 'GA1.1.1' }
    })
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    applyCookieConsentToView(request, h)

    expect(h.unstate).toHaveBeenCalledWith('_ga')
    expect(h.state).not.toHaveBeenCalled()
  })

  test('expires GA cookies from the Cookie header when they are not in request state', () => {
    const request = createViewRequest({
      state: {},
      headers: { cookie: '_ga=GA1.1.1' }
    })
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    applyCookieConsentToView(request, h)

    expect(h.unstate).toHaveBeenCalledWith('_ga')
    expect(h.state).not.toHaveBeenCalled()
  })

  test('injects default policy, current path and no-store for views', () => {
    const previousKey = config.get('googleAnalytics.googleTagManagerKey')
    config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
    const request = createViewRequest({
      path: '/signed-out',
      search: '?lang=cy'
    })
    request.response.source.context = undefined
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    try {
      const result = applyCookieConsentToView(request, h)

      expect(request.response.source.context.cookiesPolicy).toEqual({
        confirmed: false,
        essential: true,
        analytics: false
      })
      expect(request.response.source.context.currentPath).toBe(
        '/signed-out?lang=cy'
      )
      expect(request.response.header).toHaveBeenCalledWith(
        'cache-control',
        'no-store'
      )
      expect(h.unstate).not.toHaveBeenCalled()
      expect(h.state).not.toHaveBeenCalled()
      expect(result).toBe(h.continue)
    } finally {
      config.set('googleAnalytics.googleTagManagerKey', previousKey)
    }
  })

  test('expires leftover GA cookies before a choice is confirmed', () => {
    const previousKey = config.get('googleAnalytics.googleTagManagerKey')
    config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
    const request = createViewRequest({
      state: { _ga: 'GA1.1.1' }
    })
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    try {
      applyCookieConsentToView(request, h)

      expect(h.unstate).toHaveBeenCalledWith('_ga')
    } finally {
      config.set('googleAnalytics.googleTagManagerKey', previousKey)
    }
  })

  test('expires leftover GA cookies when analytics is true but not confirmed', () => {
    const previousKey = config.get('googleAnalytics.googleTagManagerKey')
    config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
    const request = createViewRequest({
      state: {
        waste_obligations_cookie_policy: {
          confirmed: false,
          essential: true,
          analytics: true
        },
        _ga: 'GA1.1.1'
      }
    })
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    try {
      applyCookieConsentToView(request, h)

      expect(h.unstate).toHaveBeenCalledWith('_ga')
    } finally {
      config.set('googleAnalytics.googleTagManagerKey', previousKey)
    }
  })

  test('expires GA cookies when analytics has been rejected', () => {
    const previousKey = config.get('googleAnalytics.googleTagManagerKey')
    config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
    const request = createViewRequest({
      state: {
        waste_obligations_cookie_policy: {
          confirmed: true,
          essential: true,
          analytics: false
        },
        _ga: 'GA1.1.1'
      }
    })
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    try {
      applyCookieConsentToView(request, h)

      expect(h.unstate).toHaveBeenCalledWith('_ga')
    } finally {
      config.set('googleAnalytics.googleTagManagerKey', previousKey)
    }
  })

  test('does not expire GA cookies when analytics has been accepted', () => {
    const previousKey = config.get('googleAnalytics.googleTagManagerKey')
    config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
    const request = createViewRequest({
      state: {
        waste_obligations_cookie_policy: {
          confirmed: true,
          essential: true,
          analytics: true
        },
        _ga: 'GA1.1.1'
      }
    })
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    try {
      applyCookieConsentToView(request, h)

      expect(h.unstate).not.toHaveBeenCalled()
    } finally {
      config.set('googleAnalytics.googleTagManagerKey', previousKey)
    }
  })
})
