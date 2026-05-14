import { describe, expect, test } from 'vitest'

import {
  obligationStatusI18nKey,
  presentObligationsForCertificateSubmit
} from './obligation-presenter.js'

const sampleObligationsPayload = {
  obligations: [
    {
      material: 'Plastic',
      recyclingTarget: 0.75,
      tonnages: {
        material: 100,
        awaitingAcceptance: 0,
        accepted: 80,
        outstanding: 5,
        obligated: 75
      },
      status: 'Met'
    },
    {
      material: 'GlassRemelt',
      recyclingTarget: 0.5,
      tonnages: {
        material: 10,
        awaitingAcceptance: 0,
        accepted: 10,
        outstanding: 0,
        obligated: 8
      },
      status: 'Met'
    },
    {
      material: 'Glass',
      recyclingTarget: 0.5,
      tonnages: {
        material: 20,
        awaitingAcceptance: 0,
        accepted: 15,
        outstanding: 5,
        obligated: 12
      },
      status: 'NotMet'
    }
  ]
}

describe('presentObligationsForCertificateSubmit', () => {
  test('builds main rows excluding GlassRemelt and adds totals', () => {
    const { overallStatus, obligationsRows, glassRows } =
      presentObligationsForCertificateSubmit(
        sampleObligationsPayload.obligations
      )

    expect(overallStatus).toBe('NotMet')
    const plastic = obligationsRows.find(
      (r) => r.materialKey === 'compliance.certificateSubmit.material.plastic'
    )
    expect(plastic?.obligationToMeet).toBe(75)
    expect(plastic?.status).toBe('Met')
    expect(plastic?.tag).toEqual({
      variant: 'green',
      i18nKey: 'compliance.certificateSubmit.obligationStatus.met'
    })
    expect(
      obligationsRows.find((r) => r.materialKey?.includes('glassRemelt'))
    ).toBeUndefined()
    expect(obligationsRows.at(-1)?.materialKey).toBe(
      'compliance.certificateSubmit.table.totalsRow'
    )
    expect(glassRows).toHaveLength(3)
    expect(glassRows[0].materialKey).toBe(
      'compliance.certificateSubmit.material.glassRemelt'
    )
    expect(glassRows[1].materialKey).toBe(
      'compliance.certificateSubmit.material.glassRemaining'
    )
  })

  test('treats empty obligations as Met with zero totals', () => {
    const { overallStatus, obligationsRows, glassRows } =
      presentObligationsForCertificateSubmit([])

    expect(overallStatus).toBe('Met')
    expect(obligationsRows).toHaveLength(1)
    expect(obligationsRows[0].materialKey).toBe(
      'compliance.certificateSubmit.table.totalsRow'
    )
    expect(obligationsRows[0].tag.variant).toBe('green')
    expect(glassRows).toHaveLength(3)
    expect(glassRows[0].obligationToMeet).toBe(0)
    expect(glassRows[0].status).toBe('Met')
  })
})

describe('obligationStatusI18nKey', () => {
  test('returns the locale key for Met and NotMet', () => {
    expect(obligationStatusI18nKey('Met')).toBe(
      'compliance.certificateSubmit.obligationStatus.met'
    )
    expect(obligationStatusI18nKey('NotMet')).toBe(
      'compliance.certificateSubmit.obligationStatus.notMet'
    )
  })

  test('returns null for NoDataYet, unknown, and missing values', () => {
    expect(obligationStatusI18nKey('NoDataYet')).toBeNull()
    expect(obligationStatusI18nKey('Pending')).toBeNull()
    expect(obligationStatusI18nKey(undefined)).toBeNull()
    expect(obligationStatusI18nKey(null)).toBeNull()
  })
})
