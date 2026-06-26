import { describe, expect, test } from 'vitest'

import { componentLocaleKey, componentT, t } from './globals.js'

describe('nunjucks globals', () => {
  test('componentLocaleKey resolves page override before shared default', () => {
    expect(
      componentLocaleKey(
        'en',
        'compliance.statementSubmit',
        'obligationsTable',
        'tonnesNote'
      )
    ).toBe('compliance.statementSubmit.components.obligationsTable.tonnesNote')
  })

  test('componentT translates resolved component copy', () => {
    expect(
      componentT('en', 'compliance.certificate', 'about', 'mustIntro')
    ).toBe('You must:')
  })

  test('t translates resolved component keys', () => {
    expect(
      t(
        'en',
        componentLocaleKey('en', 'compliance.certificate', 'about', 'mustIntro')
      )
    ).toBe('You must:')
  })

  test('componentLocaleKey resolves page-only components from page locale', () => {
    expect(
      componentLocaleKey('en', 'compliance.submitError', 'certificate', 'body1')
    ).toBe('compliance.submitError.components.certificate.body1')
  })
})
