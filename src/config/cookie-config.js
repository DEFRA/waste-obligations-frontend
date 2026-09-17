const msPerSecond = 1000
const secondsPerMinute = 60
const minutesPerHour = 60
const hoursPerDay = 24
const daysPerYear = 365

export const DEFAULT_COOKIE_POLICY_TTL_MS =
  msPerSecond * secondsPerMinute * minutesPerHour * hoursPerDay * daysPerYear

export const CONSENT_COOKIE_NAME = 'waste-obligations-cookie-policy'

export function createCookiePolicyConfig() {
  return {
    name: {
      doc: 'Cookie that stores analytics consent',
      format: String,
      default: CONSENT_COOKIE_NAME,
      env: 'COOKIE_POLICY_NAME'
    },
    ttl: {
      doc: 'Consent cookie time-to-live in milliseconds (1 year)',
      format: Number,
      default: DEFAULT_COOKIE_POLICY_TTL_MS,
      env: 'COOKIE_POLICY_TTL'
    }
  }
}

export function createGoogleAnalyticsConfig() {
  return {
    googleTagManagerKey: {
      doc: 'Google Tag Manager container ID (e.g. GTM-XXXXXXXX)',
      format: String,
      default: '',
      env: 'GOOGLE_TAG_MANAGER_KEY'
    },
    measurementId: {
      doc: 'GA4 measurement ID (G-XXXXXXXX). Loads gtag.js after consent and names the _ga_<id> cookie',
      format: String,
      default: '',
      env: 'GOOGLE_ANALYTICS_MEASUREMENT_ID'
    }
  }
}

export const GA_COOKIE_PREFIX = '_ga'
const GA4_TAG_ID_PATTERN = /^G-[A-Z0-9]+$/i
export const GTM_KEY_PATTERN = /^GTM-[A-Z0-9]+$/

export function getGtmKey(gtmKey) {
  const value = String(gtmKey ?? '')
    .trim()
    .toUpperCase()

  return GTM_KEY_PATTERN.test(value) ? value : ''
}

export function isAnalyticsConfigured(gtmKey, measurementId) {
  return Boolean(getGtmKey(gtmKey) || getGa4TagId(measurementId))
}

export function getGa4TagId(measurementId) {
  const value = String(measurementId ?? '').trim()

  if (!value) {
    return ''
  }

  const tagId = /^G-/i.test(value) ? `G-${value.slice(2)}` : `G-${value}`

  return GA4_TAG_ID_PATTERN.test(tagId) ? tagId.toUpperCase() : ''
}

export function getGa4CookieName(measurementId) {
  const tagId = getGa4TagId(measurementId)

  if (!tagId) {
    return `${GA_COOKIE_PREFIX}_<measurement-id>`
  }

  return `${GA_COOKIE_PREFIX}_${tagId.slice(2)}`
}
