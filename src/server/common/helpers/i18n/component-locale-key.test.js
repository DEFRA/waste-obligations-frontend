import { describe, expect, test } from 'vitest'

import {
  COMPLIANCE_COMPONENT_LOCALE,
  resolveComponentLocaleKey
} from './component-locale-key.js'

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

  test('returns shared about copy when page has no about override', () => {
    expect(
      resolveComponentLocaleKey(
        'en',
        'compliance.certificate',
        'about',
        'description1'
      )
    ).toBe('compliance.components.about.description1')
  })

  test('returns page-specific about copy when statement overrides', () => {
    expect(
      resolveComponentLocaleKey(
        'en',
        'compliance.statement',
        'about',
        'description1'
      )
    ).toBe('compliance.statement.components.about.description1')
  })

  test('returns shared declaration copy when page has no override', () => {
    expect(
      resolveComponentLocaleKey(
        'en',
        'compliance.certificateSubmit',
        'declaration',
        'intro'
      )
    ).toBe('compliance.components.declaration.intro')
  })

  test('returns page-specific submit error copy', () => {
    expect(
      resolveComponentLocaleKey(
        'en',
        'compliance.submitError',
        'certificate',
        'body1'
      )
    ).toBe('compliance.submitError.components.certificate.body1')
  })

  test('returns nested page override keys', () => {
    expect(
      resolveComponentLocaleKey(
        'en',
        'compliance.certificateView',
        'obligationsTable',
        'obligationStatus.met'
      )
    ).toBe(
      'compliance.certificateView.components.obligationsTable.obligationStatus.met'
    )
  })

  test('returns page-only regulation43 copy', () => {
    expect(
      resolveComponentLocaleKey(
        'en',
        'compliance.statementSubmit',
        'regulation43',
        'heading'
      )
    ).toBe('compliance.statementSubmit.components.regulation43.heading')
  })

  test('returns shared success copy when page has no override', () => {
    expect(
      resolveComponentLocaleKey(
        'en',
        'compliance.certificateSuccess',
        'success',
        'viewCertificateButton'
      )
    ).toBe('compliance.components.success.viewCertificateButton')
  })

  test('returns page-only certificate view copy', () => {
    expect(
      resolveComponentLocaleKey(
        'en',
        'compliance.certificateView',
        'page',
        'returnButton'
      )
    ).toBe('compliance.certificateView.components.page.returnButton')
  })

  test('returns page-specific success copy when statement overrides', () => {
    expect(
      resolveComponentLocaleKey(
        'en',
        'compliance.statementSuccess',
        'success',
        'confirmationEmail'
      )
    ).toBe('compliance.statementSuccess.components.success.confirmationEmail')
  })
})
