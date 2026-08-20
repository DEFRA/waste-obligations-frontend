import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  normaliseLocale
} from './locales.js'

export const USER_LOCALE_SESSION_KEY = 'locale'

function persistUserLocale(request, locale) {
  try {
    request?.yar?.set?.(USER_LOCALE_SESSION_KEY, locale)
  } catch {
    // Session may be unavailable during error handling
  }
}

function getStoredSessionLocale(request) {
  try {
    const userLocale = normaliseLocale(
      request?.yar?.get(USER_LOCALE_SESSION_KEY)
    )

    if (isSupportedLocale(userLocale)) {
      return userLocale
    }

    const authLocale = normaliseLocale(request?.yar?.get('authLocale'))

    if (isSupportedLocale(authLocale)) {
      return authLocale
    }
  } catch {
    // Session may be unavailable during error handling
  }

  return null
}

export function getLocale(request) {
  const queryLocale = normaliseLocale(request?.query?.lang)

  if (isSupportedLocale(queryLocale)) {
    persistUserLocale(request, queryLocale)
    return queryLocale
  }

  return getStoredSessionLocale(request) ?? DEFAULT_LOCALE
}
