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
})
