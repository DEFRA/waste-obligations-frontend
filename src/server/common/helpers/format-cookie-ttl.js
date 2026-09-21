import { translate } from './i18n/translate.js'

const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const HOURS_PER_DAY = 24
const DAYS_PER_YEAR = 365
const MS_PER_YEAR = HOURS_PER_DAY * DAYS_PER_YEAR * MS_PER_HOUR

export function formatCookieTtl(ttlMs, locale = 'en') {
  if (ttlMs === MS_PER_YEAR) {
    return translate(locale, 'cookies.policy.expires')
  }

  const hours = ttlMs / MS_PER_HOUR

  if (hours >= 1 && Number.isInteger(hours)) {
    if (hours === 1) {
      return translate(locale, 'cookies.ttl.hour')
    }

    return translate(locale, 'cookies.ttl.hours', { count: hours })
  }

  const minutes = Math.round(ttlMs / MS_PER_MINUTE)

  if (minutes === 1) {
    return translate(locale, 'cookies.ttl.minute')
  }

  return translate(locale, 'cookies.ttl.minutes', { count: minutes })
}
