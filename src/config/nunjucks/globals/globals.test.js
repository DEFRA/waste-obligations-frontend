import { describe, expect, test } from 'vitest'

import { componentKey, t } from './globals.js'

describe('nunjucks globals', () => {
  test('componentKey resolves page override before shared default', () => {
    expect(
      componentKey(
        'en',
        'compliance.statementSubmit',
        'obligationsTable',
        'tonnesNote'
      )
    ).toBe('compliance.statementSubmit.components.obligationsTable.tonnesNote')
  })

  test('t translates resolved component keys', () => {
    expect(
      t(
        'en',
        componentKey('en', 'compliance.certificate', 'about', 'mustIntro')
      )
    ).toBe('You must:')
  })

  test('componentKey resolves page-only components from page locale', () => {
    expect(
      componentKey('en', 'compliance.submitError', 'certificate', 'body1')
    ).toBe('compliance.submitError.components.certificate.body1')
  })
})
