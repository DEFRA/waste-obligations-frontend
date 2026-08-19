import { getLocale } from './get-locale.js'

describe('getLocale', () => {
  test('returns locale from lang query parameter when supported', () => {
    const locale = getLocale({
      query: { lang: 'cy' }
    })

    expect(locale).toBe('cy')
  })

  test('returns default en locale when no supported locale found', () => {
    const locale = getLocale({
      query: { lang: 'fr' }
    })

    expect(locale).toBe('en')
  })

  test('returns locale stored in yar during authentication', () => {
    const locale = getLocale({
      yar: {
        get: (key) => (key === 'authLocale' ? 'cy' : undefined)
      }
    })

    expect(locale).toBe('cy')
  })
})
