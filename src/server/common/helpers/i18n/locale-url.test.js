import { describe, expect, test } from 'vitest'

import {
  appendLangQuery,
  clearAuthLocale,
  persistAuthLocale
} from './locale-url.js'

describe('locale-url', () => {
  describe('appendLangQuery', () => {
    test('returns the path unchanged for English', () => {
      expect(
        appendLangQuery('/compliance/producer/org/certificate', 'en')
      ).toBe('/compliance/producer/org/certificate')
    })

    test('appends lang query for Welsh', () => {
      expect(
        appendLangQuery('/compliance/producer/org/certificate?year=2024', 'cy')
      ).toBe('/compliance/producer/org/certificate?year=2024&lang=cy')
    })

    test('does not append lang when path already has lang query', () => {
      expect(
        appendLangQuery(
          '/compliance/producer/org/certificate?year=2024&lang=cy',
          'cy'
        )
      ).toBe('/compliance/producer/org/certificate?year=2024&lang=cy')
    })
  })

  describe('persistAuthLocale', () => {
    test('stores Welsh locale in yar', () => {
      const store = new Map()
      const request = {
        yar: {
          set: (key, value) => store.set(key, value)
        }
      }

      persistAuthLocale(request, 'cy')

      expect(store.get('authLocale')).toBe('cy')
    })

    test('does not store English locale', () => {
      const store = new Map()
      const request = {
        yar: {
          set: (key, value) => store.set(key, value)
        }
      }

      persistAuthLocale(request, 'en')

      expect(store.has('authLocale')).toBe(false)
    })
  })

  describe('clearAuthLocale', () => {
    test('clears stored auth locale', () => {
      const store = new Map([['authLocale', 'cy']])
      const request = {
        yar: {
          clear: (key) => store.delete(key)
        }
      }

      clearAuthLocale(request)

      expect(store.has('authLocale')).toBe(false)
    })
  })
})
