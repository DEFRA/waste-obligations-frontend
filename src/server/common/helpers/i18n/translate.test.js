import { describe, expect, test, vi } from 'vitest'

import { hasLocaleKey, translate } from './translate.js'

describe('translate', () => {
  test('returns english translation by key', () => {
    expect(
      translate('en', 'compliance.certificate.heading', { year: 2024 })
    ).toBe('About your 2024 certificate of compliance')
  })

  test('returns welsh translation by key', () => {
    expect(translate('cy', 'common.continue')).toBe('Continue')
    expect(translate('cy', 'auth.signInFailed.heading')).toBe(
      'Methu mewngofnodi'
    )
  })

  test('interpolates params in translation values', () => {
    expect(
      translate('en', 'compliance.components.about.description1', {
        year: 2024,
        regulatorName: 'Environment Agency'
      })
    ).toContain('2024')
  })

  test('returns key when translation key does not exist', () => {
    expect(translate('cy', 'common.missingKey')).toBe('common.missingKey')
  })

  test('returns key when the resolved translation is not a string', async () => {
    vi.resetModules()
    vi.doMock('node:fs', () => ({
      readFileSync: () =>
        JSON.stringify({
          compliance: { common: { objectValue: { nested: 1 } } }
        })
    }))

    const { translate: translateWithMockedLocales } =
      await import('./translate.js')

    expect(translateWithMockedLocales('en', 'common.objectValue')).toBe(
      'common.objectValue'
    )

    vi.doUnmock('node:fs')
    vi.resetModules()
    await import('./translate.js')
  })
})

describe('hasLocaleKey', () => {
  test('returns true when key exists in english locale', () => {
    expect(hasLocaleKey('en', 'compliance.components.about.mustIntro')).toBe(
      true
    )
  })

  test('returns true for page component override keys', () => {
    expect(
      hasLocaleKey(
        'en',
        'compliance.statementSubmit.components.obligationsTable.tonnesNote'
      )
    ).toBe(true)
  })

  test('returns false when key does not exist', () => {
    expect(hasLocaleKey('en', 'compliance.components.about.missingKey')).toBe(
      false
    )
  })
})
