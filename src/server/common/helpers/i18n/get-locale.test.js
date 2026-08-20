import { getLocale, USER_LOCALE_SESSION_KEY } from './get-locale.js'

function createYar(initial = {}) {
  const store = new Map(Object.entries(initial))

  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
    store
  }
}

describe('getLocale', () => {
  test('returns locale from lang query parameter when supported', () => {
    const locale = getLocale({
      query: { lang: 'cy' }
    })

    expect(locale).toBe('cy')
  })

  test('stores supported lang query in the user session', () => {
    const yar = createYar()

    expect(
      getLocale({
        query: { lang: 'cy' },
        yar
      })
    ).toBe('cy')
    expect(yar.store.get(USER_LOCALE_SESSION_KEY)).toBe('cy')
  })

  test('stores English lang query in the user session so later pages stay English', () => {
    const yar = createYar({ [USER_LOCALE_SESSION_KEY]: 'cy' })

    expect(
      getLocale({
        query: { lang: 'en' },
        yar
      })
    ).toBe('en')
    expect(yar.store.get(USER_LOCALE_SESSION_KEY)).toBe('en')
  })

  test('returns locale stored in the user session when lang query is absent', () => {
    const locale = getLocale({
      query: {},
      yar: createYar({ [USER_LOCALE_SESSION_KEY]: 'cy' })
    })

    expect(locale).toBe('cy')
  })

  test('prefers lang query over a stored session locale', () => {
    const locale = getLocale({
      query: { lang: 'en' },
      yar: createYar({ [USER_LOCALE_SESSION_KEY]: 'cy' })
    })

    expect(locale).toBe('en')
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

  test('prefers stored user locale over auth locale', () => {
    const locale = getLocale({
      yar: createYar({
        [USER_LOCALE_SESSION_KEY]: 'en',
        authLocale: 'cy'
      })
    })

    expect(locale).toBe('en')
  })

  test('returns query locale when session cannot be written', () => {
    const locale = getLocale({
      query: { lang: 'cy' },
      yar: {
        set: () => {
          throw new Error('Session unavailable')
        }
      }
    })

    expect(locale).toBe('cy')
  })
})
