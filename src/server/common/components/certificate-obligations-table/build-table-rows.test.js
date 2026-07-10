import { describe, expect, test } from 'vitest'

import { buildCertificateObligationTableRows } from './build-table-rows.js'

describe('buildCertificateObligationTableRows', () => {
  test('builds govuk table rows with rendered status tags', () => {
    const rows = buildCertificateObligationTableRows(
      [
        {
          materialKey: 'compliance.components.obligationsTable.material.wood',
          obligationToMeet: 80,
          awaitingAcceptance: 0,
          accepted: 0,
          outstanding: 100,
          tag: {
            variant: 'yellow',
            i18nKey:
              'compliance.components.obligationsTable.obligationStatus.notMet'
          }
        }
      ],
      'en'
    )

    expect(rows[0][0]).toEqual({ text: 'Wood' })
    expect(rows[0][1]).toEqual({ text: '80', format: 'numeric' })
    expect(rows[0][4]).toEqual({ text: '100', format: 'numeric' })
    expect(rows[0][5].html).toContain('Not met')
  })

  test('announces Not available yet for null obligation and outstanding cells', () => {
    const rows = buildCertificateObligationTableRows(
      [
        {
          materialKey: 'compliance.components.obligationsTable.material.wood',
          obligationToMeet: null,
          awaitingAcceptance: 0,
          accepted: 0,
          outstanding: null,
          tag: {
            variant: 'grey',
            i18nKey:
              'compliance.components.obligationsTable.obligationStatus.noDataYet'
          }
        }
      ],
      'en'
    )

    const notAvailableHtml =
      '<span class="govuk-visually-hidden">Not available yet</span><span aria-hidden="true">-</span>'

    expect(rows[0][1]).toEqual({ html: notAvailableHtml, format: 'numeric' })
    expect(rows[0][2]).toEqual({ text: '0', format: 'numeric' })
    expect(rows[0][3]).toEqual({ text: '0', format: 'numeric' })
    expect(rows[0][4]).toEqual({ html: notAvailableHtml, format: 'numeric' })
  })

  test('renders empty status cell when tag is missing', () => {
    const rows = buildCertificateObligationTableRows(
      [
        {
          materialKey: 'compliance.components.obligationsTable.material.wood',
          obligationToMeet: 0,
          awaitingAcceptance: 0,
          accepted: 0,
          outstanding: 0
        }
      ],
      'en'
    )

    expect(rows[0][5]).toEqual({ html: '' })
  })
})
