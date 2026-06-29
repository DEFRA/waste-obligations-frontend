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
    expect(rows[0][5].html).toContain('NOT MET')
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

  test('shows a dash for all tonnage columns when status is NoDataYet', () => {
    const rows = buildCertificateObligationTableRows(
      [
        {
          materialKey: 'compliance.components.obligationsTable.material.wood',
          obligationToMeet: 0,
          awaitingAcceptance: 0,
          accepted: 0,
          outstanding: 0,
          status: 'NoDataYet',
          tag: {
            variant: 'grey',
            i18nKey:
              'compliance.components.obligationsTable.obligationStatus.noDataYet'
          }
        }
      ],
      'en'
    )

    expect(rows[0].slice(1, 5)).toEqual([
      { text: '-', format: 'numeric' },
      { text: '-', format: 'numeric' },
      { text: '-', format: 'numeric' },
      { text: '-', format: 'numeric' }
    ])
    expect(rows[0][5].html).toContain('NO DATA YET')
  })

  test('still shows 0 for outstanding when status is Met', () => {
    const rows = buildCertificateObligationTableRows(
      [
        {
          materialKey: 'compliance.components.obligationsTable.material.wood',
          obligationToMeet: 0,
          awaitingAcceptance: 0,
          accepted: 0,
          outstanding: 0,
          status: 'Met',
          tag: {
            variant: 'green',
            i18nKey:
              'compliance.components.obligationsTable.obligationStatus.met'
          }
        }
      ],
      'en'
    )

    expect(rows[0][4]).toEqual({ text: '0', format: 'numeric' })
  })
})
