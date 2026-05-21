import { translate } from './translate.js'

describe('translate', () => {
  test('returns english translation by key', () => {
    expect(translate('en', 'compliance.certificate.heading')).toBe(
      'About your certificate of compliance'
    )
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
})
