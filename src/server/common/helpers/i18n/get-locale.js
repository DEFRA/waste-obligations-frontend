const SUPPORTED_LOCALES = ['en', 'cy']
const DEFAULT_LOCALE = 'en'

function normaliseLocale(rawLocale) {
  return String(rawLocale ?? '')
    .trim()
    .toLowerCase()
    .split('-')[0]
}

export function getLocale(request) {
  const queryLocale = normaliseLocale(request?.query?.lang)

  if (SUPPORTED_LOCALES.includes(queryLocale)) {
    return queryLocale
  }

  const headerLocale = normaliseLocale(
    request?.headers?.['accept-language']?.split(',')[0]
  )

  if (SUPPORTED_LOCALES.includes(headerLocale)) {
    return headerLocale
  }

  return DEFAULT_LOCALE
}
