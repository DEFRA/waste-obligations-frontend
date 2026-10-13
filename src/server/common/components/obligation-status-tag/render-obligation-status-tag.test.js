import { describe, expect, test } from 'vitest'

import { renderObligationStatusTagHtml } from './render-obligation-status-tag.js'

describe('renderObligationStatusTagHtml', () => {
  test('renders a green met tag', () => {
    expect(
      renderObligationStatusTagHtml('en', {
        variant: 'green',
        i18nKey: 'compliance.components.obligationsTable.obligationStatus.met'
      })
    ).toBe('<strong class="govuk-tag govuk-tag--green">Met</strong>')
  })

  test('renders a yellow not met tag', () => {
    expect(
      renderObligationStatusTagHtml('en', {
        variant: 'yellow',
        i18nKey:
          'compliance.components.obligationsTable.obligationStatus.notMet'
      })
    ).toBe('<strong class="govuk-tag govuk-tag--yellow">Not met</strong>')
  })

  test('returns empty string when tag or i18n key is missing', () => {
    expect(renderObligationStatusTagHtml('en', null)).toBe('')
    expect(renderObligationStatusTagHtml('en', { variant: 'green' })).toBe('')
  })

  test('falls back to grey for unknown variants', () => {
    expect(
      renderObligationStatusTagHtml('en', {
        variant: 'unknown',
        i18nKey:
          'compliance.components.obligationsTable.obligationStatus.noDataYet'
      })
    ).toBe('<strong class="govuk-tag govuk-tag--grey">No data yet</strong>')
  })

  test('renders a red tag variant', () => {
    expect(
      renderObligationStatusTagHtml('en', {
        variant: 'red',
        i18nKey: 'compliance.components.obligationsTable.obligationStatus.met'
      })
    ).toBe('<strong class="govuk-tag govuk-tag--red">Met</strong>')
  })
})
