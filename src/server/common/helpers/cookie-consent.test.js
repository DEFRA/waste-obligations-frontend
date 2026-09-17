import { describe, beforeEach, afterEach, test, expect, vi } from 'vitest'

import { config } from '#/config/config.js'
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
      state: {
        [cookieNamePolicy]: undefined,
        _ga: '123',
        _gid: '123'
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
    expect(getCurrentPolicy(request, h)).toStrictEqual(defaultCookie)
  })

  test('getCurrentPolicy returns default cookie if request state is missing', () => {
    request.state = null

    expect(getCurrentPolicy(request, h)).toStrictEqual(defaultCookie)
  })

  test('getCurrentPolicy sets default cookie if policy does not exist', () => {
    getCurrentPolicy(request, h)

    expect(h.state).toHaveBeenCalledWith(
      cookieNamePolicy,
      defaultCookie,
      getConsentCookieOptions()
    )
  })

  test('getCurrentPolicy returns cookie if policy exists', () => {
    request.state[cookieNamePolicy] = {
      confirmed: true,
      essential: false,
      analytics: true
    }

    expect(getCurrentPolicy(request, h)).toStrictEqual({
      confirmed: true,
      essential: false,
      analytics: true
    })
    expect(h.state).not.toHaveBeenCalled()
  })

  test('updatePolicy sets confirmed cookie when policy does not exist', () => {
    updatePolicy(request, h, true)

    expect(h.state).toHaveBeenNthCalledWith(
      2,
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
    expect(h.unstate).toHaveBeenCalledWith('_gid')
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

  test('removeAnalytics does nothing when request state is missing', () => {
    request.state = null

    removeAnalytics(request, h)

    expect(h.unstate).not.toHaveBeenCalled()
  })

  test('consent cookie uses a one-year ttl and the session secure flag', () => {
    expect(config.get('cookiePolicy.ttl')).toBe(1000 * 60 * 60 * 24 * 365)
    expect(getConsentCookieOptions()).toMatchObject({
      encoding: 'base64json',
      isHttpOnly: false,
      isSameSite: 'Lax',
      isSecure: config.get('session.cookie.secure'),
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
