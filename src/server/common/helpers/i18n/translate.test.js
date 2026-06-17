import { describe, expect, test, vi } from 'vitest'

import { translate } from './translate.js'

describe('translate', () => {
  test('returns english translation by key', () => {
    expect(
      translate('en', 'compliance.certificate.heading', { year: 2024 })
    ).toBe('About your 2024 certificate of compliance')
  })

  test('returns welsh translation by key', () => {
    expect(translate('cy', 'compliance.common.continue')).toBe('Continue')
  })

  test('interpolates params in translation values', () => {
    expect(
      translate('en', 'compliance.certificate.description1', { year: 2024 })
    ).toContain('2024')
  })

  test('returns key when translation key does not exist', () => {
    expect(translate('cy', 'auth.signInFailed.heading')).toBe(
      'Methu mewngofnodi'
    )

    expect(translate('cy', 'compliance.common.missingKey')).toBe(
      'compliance.common.missingKey'
    )
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
