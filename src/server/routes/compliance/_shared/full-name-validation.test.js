import { describe, expect, test } from 'vitest'

import {
  FULL_NAME_ERROR_KEYS,
  FULL_NAME_MAX_LENGTH,
  getFullNameErrorKey
} from './full-name-validation.js'

describe('getFullNameErrorKey', () => {
  test('returns empty when value is blank', () => {
    expect(getFullNameErrorKey('')).toBe(FULL_NAME_ERROR_KEYS.empty)
    expect(getFullNameErrorKey('   ')).toBe(FULL_NAME_ERROR_KEYS.empty)
    expect(getFullNameErrorKey(null)).toBe(FULL_NAME_ERROR_KEYS.empty)
  })

  test('returns tooShort when value is one character', () => {
    expect(getFullNameErrorKey('A')).toBe(FULL_NAME_ERROR_KEYS.tooShort)
    expect(getFullNameErrorKey(' A ')).toBe(FULL_NAME_ERROR_KEYS.tooShort)
  })

  test('returns tooLong when value exceeds max length', () => {
    expect(getFullNameErrorKey('a'.repeat(FULL_NAME_MAX_LENGTH + 1))).toBe(
      FULL_NAME_ERROR_KEYS.tooLong
    )
  })

  test('returns invalidChars when value contains disallowed characters', () => {
    expect(getFullNameErrorKey('Jane@Doe')).toBe(
      FULL_NAME_ERROR_KEYS.invalidChars
    )
    expect(getFullNameErrorKey('Jane#Doe')).toBe(
      FULL_NAME_ERROR_KEYS.invalidChars
    )
    expect(getFullNameErrorKey('Jane$Doe')).toBe(
      FULL_NAME_ERROR_KEYS.invalidChars
    )
    expect(getFullNameErrorKey('Jane%Doe')).toBe(
      FULL_NAME_ERROR_KEYS.invalidChars
    )
    expect(getFullNameErrorKey('Jane&Doe')).toBe(
      FULL_NAME_ERROR_KEYS.invalidChars
    )
    expect(getFullNameErrorKey('Jane<Doe')).toBe(
      FULL_NAME_ERROR_KEYS.invalidChars
    )
    expect(getFullNameErrorKey('Jane>Doe')).toBe(
      FULL_NAME_ERROR_KEYS.invalidChars
    )
  })

  test('returns null for valid names', () => {
    expect(getFullNameErrorKey('Jane Doe')).toBeNull()
    expect(getFullNameErrorKey('Jo')).toBeNull()
    expect(getFullNameErrorKey('a'.repeat(FULL_NAME_MAX_LENGTH))).toBeNull()
  })
})
