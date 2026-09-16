import {
  createCookiePolicyConfig,
  createGoogleAnalyticsConfig,
  DEFAULT_COOKIE_POLICY_TTL_MS,
  getGa4CookieName,
  getGa4TagId
} from './cookie-config.js'

describe('Cookie configuration', () => {
  test('defaults the consent cookie to one year', () => {
    const cookiePolicyConfig = createCookiePolicyConfig()

    expect(cookiePolicyConfig.name.default).toBe(
      'waste-obligations-cookie-policy'
    )
    expect(cookiePolicyConfig.ttl.default).toBe(DEFAULT_COOKIE_POLICY_TTL_MS)
    expect(DEFAULT_COOKIE_POLICY_TTL_MS).toBe(31_536_000_000)
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
})
