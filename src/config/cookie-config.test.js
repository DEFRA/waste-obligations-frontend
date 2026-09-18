import {
  createGoogleAnalyticsConfig,
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_TTL_MS,
  getGa4CookieName,
  getGa4TagId,
  getGtmKey,
  isAnalyticsConfigured
} from './cookie-config.js'

describe('Cookie configuration', () => {
  test('hardcodes the consent cookie name and a one-year ttl', () => {
    expect(CONSENT_COOKIE_NAME).toBe('waste-obligations-cookie-policy')
    expect(CONSENT_COOKIE_TTL_MS).toBe(31_536_000_000)
  })

  test('leaves Google Tag Manager and the GA4 measurement ID unset by default', () => {
    const googleAnalyticsConfig = createGoogleAnalyticsConfig()

    expect(googleAnalyticsConfig.googleTagManagerKey.default).toBe('')
    expect(googleAnalyticsConfig.googleTagManagerKey.env).toBe(
      'GOOGLE_TAG_MANAGER_KEY'
    )
    expect(googleAnalyticsConfig.measurementId.default).toBe('')
    expect(googleAnalyticsConfig.measurementId.env).toBe(
      'GOOGLE_ANALYTICS_MEASUREMENT_ID'
    )
  })

  test('names the GA4 cookie from the measurement ID', () => {
    expect(getGa4CookieName('')).toBe('_ga_<measurement-id>')
    expect(getGa4CookieName('not a valid id')).toBe('_ga_<measurement-id>')
    expect(getGa4CookieName('G-VMDE8PW9W7')).toBe('_ga_VMDE8PW9W7')
    expect(getGa4CookieName('VMDE8PW9W7')).toBe('_ga_VMDE8PW9W7')
  })

  test('normalises a GA4 measurement ID for gtag', () => {
    expect(getGa4TagId('')).toBe('')
    expect(getGa4TagId('not a valid id')).toBe('')
    expect(getGa4TagId('VMDE8PW9W7')).toBe('G-VMDE8PW9W7')
    expect(getGa4TagId('G-VMDE8PW9W7')).toBe('G-VMDE8PW9W7')
    expect(getGa4TagId('g-vmde8pw9w7')).toBe('G-VMDE8PW9W7')
  })

  test('normalises a Google Tag Manager container ID', () => {
    expect(getGtmKey('')).toBe('')
    expect(getGtmKey('not-a-gtm-key')).toBe('')
    expect(getGtmKey('GTM-ABC123')).toBe('GTM-ABC123')
    expect(getGtmKey('gtm-abc123')).toBe('GTM-ABC123')
  })

  test('treats missing Google analytics IDs as the feature being off', () => {
    expect(isAnalyticsConfigured('', '')).toBe(false)
    expect(isAnalyticsConfigured('not-a-gtm-key', 'not a valid id')).toBe(false)
    expect(isAnalyticsConfigured('GTM-ABC123', '')).toBe(true)
    expect(isAnalyticsConfigured('', 'G-VMDE8PW9W7')).toBe(true)
    expect(isAnalyticsConfigured('GTM-ABC123', 'G-VMDE8PW9W7')).toBe(true)
  })
})
