import { translate } from './i18n/translate.js'

const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 60 * MS_PER_MINUTE

export function formatCookieTtl(ttlMs, locale = 'en') {
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
