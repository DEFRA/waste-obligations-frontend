import { describe, expect, test, vi } from 'vitest'

import {
  COMPLIANCE_COMPONENT_LOCALE,
  buildPageViewModel,
  hasLocaleKey,
  pageI18n,
  resolveComponentLocaleKey,
  translate,
  translateComponent
} from './translate.js'

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

    expect(
      translateWithMockedLocales('en', 'compliance.common.objectValue')
    ).toBe('compliance.common.objectValue')

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

describe('resolveComponentLocaleKey', () => {
  test('returns shared component default when page has no override', () => {
    expect(
      resolveComponentLocaleKey(
        'en',
        'compliance.certificateSubmit',
        'obligationsTable',
        'tonnesNote'
      )
    ).toBe('compliance.components.obligationsTable.tonnesNote')
  })

  test('returns page component override when defined', () => {
    expect(
      resolveComponentLocaleKey(
        'en',
        'compliance.statementSubmit',
        'obligationsTable',
        'tonnesNote'
      )
    ).toBe('compliance.statementSubmit.components.obligationsTable.tonnesNote')
  })

  test('returns shared default when pageLocaleBase is omitted', () => {
    expect(
      resolveComponentLocaleKey('en', null, 'summaryList', 'organisationName')
    ).toBe(`${COMPLIANCE_COMPONENT_LOCALE.summaryList}.organisationName`)
  })

  test('returns the key when page and shared component locales are unavailable', () => {
    expect(
      resolveComponentLocaleKey('en', null, 'unknownComponent', 'fallbackKey')
    ).toBe('fallbackKey')
  })
})

describe('translateComponent', () => {
  test('translates resolved component copy', () => {
    expect(
      translateComponent('en', 'compliance.certificate', 'about', 'mustIntro')
    ).toBe('You must:')
  })
})

describe('pageI18n', () => {
  test('translates page and component copy from a bound locale base', () => {
    const p = pageI18n('en', 'compliance.certificate')

    expect(p.t('heading', { year: 2024 })).toBe(
      'About your 2024 certificate of compliance'
    )
    expect(p.ct('about', 'mustIntro')).toBe('You must:')
    expect(p.ck('about', 'mustIntro')).toBe(
      'compliance.components.about.mustIntro'
    )
  })
})

describe('buildPageViewModel', () => {
  test('returns translated page title and heading', () => {
    expect(
      buildPageViewModel({ headers: { 'accept-language': 'en' } }, 'cookies')
    ).toEqual({
      pageTitle: 'Cookies',
      heading: 'Cookies'
    })
  })
})
