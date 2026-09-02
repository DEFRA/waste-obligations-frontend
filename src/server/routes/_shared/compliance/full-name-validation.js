import { translate } from '#/server/common/helpers/i18n/translate.js'

export const FULL_NAME_MAX_LENGTH = 255
const INVALID_CHARACTERS_REGEX = /[@#$%&<>]/

export const FULL_NAME_ERROR_KEYS = {
  empty: 'compliance.validation.fullName.empty',
  tooShort: 'compliance.validation.fullName.tooShort',
  tooLong: 'compliance.validation.fullName.tooLong',
  invalidChars: 'compliance.validation.fullName.invalidChars'
}

export function getFullNameErrorKey(value) {
  const trimmed = (value ?? '').trim()

  if (!trimmed) {
    return FULL_NAME_ERROR_KEYS.empty
  }

  if (trimmed.length === 1) {
    return FULL_NAME_ERROR_KEYS.tooShort
  }

  if (trimmed.length > FULL_NAME_MAX_LENGTH) {
    return FULL_NAME_ERROR_KEYS.tooLong
  }

  if (INVALID_CHARACTERS_REGEX.test(trimmed)) {
    return FULL_NAME_ERROR_KEYS.invalidChars
  }

  return null
}

export function getFullNameFormErrors(value, locale) {
  const errorKey = getFullNameErrorKey(value)

  if (!errorKey) {
    return null
  }

  const message = translate(locale, errorKey)

  return {
    summary: [{ text: message, href: '#fullName' }],
    fields: { fullName: message }
  }
}
