const SUPPORTED_LOCALES = new Set(['en', 'cy'])

function normaliseLocale(rawLocale) {
  return String(rawLocale ?? '')
    .trim()
    .toLowerCase()
    .split('-')[0]
}

/**
 * Appends `lang` when the locale is not English.
 *
 * @param {string} pathOrUrl
 * @param {string} locale
 * @returns {string}
 */
export function appendLangQuery(pathOrUrl, locale) {
  const normalised = normaliseLocale(locale)

  if (!SUPPORTED_LOCALES.has(normalised) || normalised === 'en') {
    return pathOrUrl
  }

  const separator = pathOrUrl.includes('?') ? '&' : '?'
  return `${pathOrUrl}${separator}lang=${normalised}`
}

/**
 * Persists the resolved locale for the OAuth round trip.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {string} locale
 */
export function persistAuthLocale(request, locale) {
  if (normaliseLocale(locale) === 'en') {
    return
  }

  request.yar?.set('authLocale', normaliseLocale(locale))
}

/**
 * @param {import('@hapi/hapi').Request} request
 */
export function clearAuthLocale(request) {
  request.yar?.clear('authLocale')
}
