import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'

import { config } from '#/config/config.js'
import {
  CONSENT_COOKIE_NAME,
  DEFAULT_COOKIE_POLICY_TTL_MS
} from '#/config/cookie-config.js'
import {
  createDefaultPolicy,
  getConsentCookieName,
  getConsentCookieOptions,
  getCurrentPolicy,
  isGoogleAnalyticsEnabled,
  removeAnalytics,
  updatePolicy
} from './cookie-consent.js'

describe('cookie-consent', () => {
  const cookieNamePolicy = getConsentCookieName()
  const defaultCookie = createDefaultPolicy()

  let request
  let h

  beforeEach(() => {
    request = {
      headers: {},
      state: {
        [cookieNamePolicy]: undefined,
        _ga: '123'
      }
    }

    h = {
      state: vi.fn(),
      unstate: vi.fn()
    }
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  test('getCurrentPolicy returns default cookie if policy does not exist', () => {
    expect(getCurrentPolicy(request)).toStrictEqual(defaultCookie)
  })

  test('getCurrentPolicy returns default cookie if request state is missing', () => {
    request.state = null

    expect(getCurrentPolicy(request)).toStrictEqual(defaultCookie)
  })

  test('getCurrentPolicy does not persist a consent cookie until the user confirms a choice', () => {
    getCurrentPolicy(request)

    expect(h.state).not.toHaveBeenCalled()
  })

  test('getCurrentPolicy reuses the default policy already stored on the request', () => {
    const firstPolicy = getCurrentPolicy(request)
    const secondPolicy = getCurrentPolicy(request)

    expect(secondPolicy).toBe(firstPolicy)
    expect(h.state).not.toHaveBeenCalled()
  })

  test('getCurrentPolicy returns cookie if policy exists', () => {
    request.state[cookieNamePolicy] = {
      confirmed: true,
      essential: false,
      analytics: true
    }

    expect(getCurrentPolicy(request)).toStrictEqual({
      confirmed: true,
      essential: false,
      analytics: true
    })
    expect(h.state).not.toHaveBeenCalled()
  })

  test('updatePolicy sets confirmed cookie when policy does not exist', () => {
    updatePolicy(request, h, true)

    expect(h.state).toHaveBeenCalledOnce()
    expect(h.state).toHaveBeenCalledWith(
      cookieNamePolicy,
      {
        confirmed: true,
        essential: true,
        analytics: true
      },
      getConsentCookieOptions()
    )
  })

  test('updatePolicy sets cookie to accepted', () => {
    request.state[cookieNamePolicy] = {
      confirmed: false,
      essential: true,
      analytics: false
    }

    updatePolicy(request, h, true)

    expect(h.state).toHaveBeenCalledWith(
      cookieNamePolicy,
      {
        confirmed: true,
        essential: true,
        analytics: true
      },
      getConsentCookieOptions()
    )
    expect(h.unstate).not.toHaveBeenCalled()
  })

  test('updatePolicy denying analytics removes Google cookies', () => {
    request.state[cookieNamePolicy] = {
      confirmed: false,
      essential: true,
      analytics: false
    }

    updatePolicy(request, h, false)

    expect(h.unstate).toHaveBeenCalledWith('_ga')
  })

  test('removeAnalytics expires GA stream and GTM cookies only', () => {
    request.state._dc_gtm_UA123456 = 'abc'
    request.state._ga_ABCDEF1234 = 'abc'
    request.state.session = 'xyz'
    request.state[cookieNamePolicy] = createDefaultPolicy()

    removeAnalytics(request, h)

    expect(h.unstate).toHaveBeenCalledWith('_dc_gtm_UA123456')
    expect(h.unstate).toHaveBeenCalledWith('_ga_ABCDEF1234')
    expect(h.unstate).not.toHaveBeenCalledWith('session')
    expect(h.unstate).not.toHaveBeenCalledWith(cookieNamePolicy)
  })

  test('removeAnalytics expires GA cookies from the Cookie header when they are not in request state', () => {
    request.state = {}
    request.headers = {
      cookie: '_ga=GA1.1.1; session=xyz'
    }

    removeAnalytics(request, h)

    expect(h.unstate).toHaveBeenCalledWith('_ga')
    expect(h.unstate).not.toHaveBeenCalledWith('session')
  })

  test('removeAnalytics does not expire cookies that are absent from the request', () => {
    request.state = {}
    request.headers = {}

    removeAnalytics(request, h)

    expect(h.unstate).not.toHaveBeenCalled()
  })

  test('removeAnalytics expires a bare _gat cookie from request state', () => {
    request.state = { _gat: '1', session: 'xyz' }

    removeAnalytics(request, h)

    expect(h.unstate).toHaveBeenCalledWith('_gat')
    expect(h.unstate).not.toHaveBeenCalledWith('session')
  })

  test('getConsentCookieName returns the configured consent cookie name', () => {
    expect(getConsentCookieName()).toBe(CONSENT_COOKIE_NAME)

    const previousName = config.get('cookiePolicy.name')
    config.set('cookiePolicy.name', 'custom-cookie-policy')

    try {
      expect(getConsentCookieName()).toBe('custom-cookie-policy')

      config.set('cookiePolicy.name', '')
      expect(getConsentCookieName()).toBe(CONSENT_COOKIE_NAME)
    } finally {
      config.set('cookiePolicy.name', previousName)
    }
  })

  test('consent cookie uses a one-year ttl and the session secure flag', () => {
    expect(getConsentCookieOptions()).toMatchObject({
      encoding: 'base64json',
      isHttpOnly: false,
      isSameSite: 'Lax',
      isSecure: config.get('session.cookie.secure'),
      ttl: DEFAULT_COOKIE_POLICY_TTL_MS,
      clearInvalid: true
    })
  })

  test('isGoogleAnalyticsEnabled follows the configured analytics IDs', () => {
    const previousKey = config.get('googleAnalytics.googleTagManagerKey')
    const previousId = config.get('googleAnalytics.measurementId')

    try {
      config.set('googleAnalytics.googleTagManagerKey', '')
      config.set('googleAnalytics.measurementId', '')
      expect(isGoogleAnalyticsEnabled()).toBe(false)

      config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
      expect(isGoogleAnalyticsEnabled()).toBe(true)

      config.set('googleAnalytics.googleTagManagerKey', '')
      config.set('googleAnalytics.measurementId', 'G-VMDE8PW9W7')
      expect(isGoogleAnalyticsEnabled()).toBe(true)
    } finally {
      config.set('googleAnalytics.googleTagManagerKey', previousKey)
      config.set('googleAnalytics.measurementId', previousId)
    }
  })
})
