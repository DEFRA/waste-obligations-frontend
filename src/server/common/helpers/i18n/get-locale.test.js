import { getLocale } from './get-locale.js'

describe('getLocale', () => {
  test('returns locale from lang query parameter when supported', () => {
    const locale = getLocale({
      query: { lang: 'cy' }
    })

    expect(locale).toBe('cy')
  })

  test('returns locale from accept-language header when supported', () => {
    const locale = getLocale({
      headers: { 'accept-language': 'cy-GB,cy;q=0.9,en;q=0.8' }
    })

    expect(locale).toBe('cy')
  })

  test('returns default en locale when no supported locale found', () => {
    const locale = getLocale({
      query: { lang: 'fr' },
      headers: { 'accept-language': 'fr-FR,fr;q=0.9' }
    })

    expect(locale).toBe('en')
  })

  test('returns locale stored in yar during authentication', () => {
    const locale = getLocale({
      yar: {
        get: (key) => (key === 'authLocale' ? 'cy' : undefined)
      },
      headers: { 'accept-language': 'en-GB,en;q=0.9' }
    })

    expect(locale).toBe('cy')
  })
})
