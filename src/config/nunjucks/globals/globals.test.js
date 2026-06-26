import { describe, expect, test } from 'vitest'

import { pageI18n, t } from './globals.js'

describe('nunjucks globals', () => {
  test('t translates locale keys', () => {
    expect(t('en', 'common.continue')).toBe('Continue')
  })

  test('pageI18n exposes bound page and component helpers', () => {
    const p = pageI18n('en', 'compliance.certificate')

    expect(p.t('heading', { year: 2024 })).toBe(
      'About your 2024 certificate of compliance'
    )
    expect(p.ct('about', 'mustIntro')).toBe('You must:')
    expect(p.ck('about', 'mustIntro')).toBe(
      'compliance.components.about.mustIntro'
    )
    expect(p.ck('obligationsTable', 'tonnesNote')).toBe(
      'compliance.components.obligationsTable.tonnesNote'
    )
  })

  test('pageI18n resolves page component overrides', () => {
    const p = pageI18n('en', 'compliance.statementSubmit')

    expect(p.ck('obligationsTable', 'tonnesNote')).toBe(
      'compliance.statementSubmit.components.obligationsTable.tonnesNote'
    )
  })
})
