import { describe, expect, test } from 'vitest'

import {
  buildCreateComplianceDeclarationPayload,
  formatCertificateObligationStatusForView,
  normalizeObligationRowStatus,
  presentObligationsForCertificateSubmit,
  toComplianceDeclarationObligationStatus,
  toTagStatus
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
      presentObligationsForCertificateSubmit(sampleObligationsPayload)

    expect(overallStatus).toBe('not_met')
    const plastic = obligationsRows.find(
      (r) => r.materialKey === 'compliance.certificateSubmit.material.plastic'
    )
    expect(plastic?.obligationToMeet).toBe(75)
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

  test('treats empty obligations as met with zero totals', () => {
    const { overallStatus, obligationsRows } =
      presentObligationsForCertificateSubmit({ obligations: [] })

    expect(overallStatus).toBe('met')
    expect(obligationsRows).toHaveLength(1)
    expect(obligationsRows[0].materialKey).toBe(
      'compliance.certificateSubmit.table.totalsRow'
    )
  })
})

describe('toTagStatus', () => {
  test.each([
    ['met', 'compliance.certificateSubmit.obligationStatus.met', 'green'],
    ['MET', 'compliance.certificateSubmit.obligationStatus.met', 'green'],
    ['Met', 'compliance.certificateSubmit.obligationStatus.met', 'green'],
    ['not met', 'compliance.certificateSubmit.obligationStatus.notMet', 'red'],
    ['not_met', 'compliance.certificateSubmit.obligationStatus.notMet', 'red'],
    ['NotMet', 'compliance.certificateSubmit.obligationStatus.notMet', 'red'],
    [
      'NoDataYet',
      'compliance.certificateSubmit.obligationStatus.noDataYet',
      'grey'
    ]
  ])('maps %s to i18n tag', (input, expectedKey, variant) => {
    expect(toTagStatus(input)).toEqual({
      variant,
      i18nKey: expectedKey
    })
  })

  test('maps unknown status to grey with other key', () => {
    expect(toTagStatus('Pending')).toEqual({
      variant: 'grey',
      i18nKey: 'compliance.certificateSubmit.obligationStatus.other',
      i18nParams: { status: 'Pending' }
    })
  })

  test('maps empty status to no data yet', () => {
    expect(toTagStatus('')).toEqual({
      variant: 'grey',
      i18nKey: 'compliance.certificateSubmit.obligationStatus.noDataYet'
    })
    expect(toTagStatus(null)).toEqual({
      variant: 'grey',
      i18nKey: 'compliance.certificateSubmit.obligationStatus.noDataYet'
    })
  })
})

describe('normalizeObligationRowStatus', () => {
  test('normalizes API casing', () => {
    expect(normalizeObligationRowStatus('NotMet')).toBe('not_met')
    expect(normalizeObligationRowStatus('Met')).toBe('met')
    expect(normalizeObligationRowStatus('NoDataYet')).toBe('no_data_yet')
  })

  test('treats unknown status as no_data_yet for rules', () => {
    expect(normalizeObligationRowStatus('Pending')).toBe('no_data_yet')
  })
})

describe('formatCertificateObligationStatusForView', () => {
  test('maps API and presenter values to success page labels', () => {
    expect(formatCertificateObligationStatusForView('Met')).toBe('Met')
    expect(formatCertificateObligationStatusForView('NotMet')).toBe('Not met')
    expect(formatCertificateObligationStatusForView('met')).toBe('Met')
    expect(formatCertificateObligationStatusForView('not_met')).toBe('Not met')
    expect(formatCertificateObligationStatusForView('NoDataYet')).toBe('')
  })
})

describe('toComplianceDeclarationObligationStatus', () => {
  test('maps overall to API obligationStatus strings', () => {
    expect(toComplianceDeclarationObligationStatus('met')).toBe('Met')
    expect(toComplianceDeclarationObligationStatus('not_met')).toBe('NotMet')
  })
})

describe('buildCreateComplianceDeclarationPayload', () => {
  test('includes obligations array and submitter details', () => {
    const obligations = sampleObligationsPayload.obligations
    const payload = buildCreateComplianceDeclarationPayload({
      organisation: {
        id: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
        name: 'Org',
        companiesHouseNumber: 'CH1',
        address: { addressLine1: '1 Road' }
      },
      organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
      obligationYear: 2026,
      obligations,
      obligationStatus: 'Met',
      fullName: '  Pat  ',
      user: { id: 'u1', email: 'e@x.com' }
    })

    expect(payload.obligationYear).toBe(2026)
    expect(payload.obligationStatus).toBe('Met')
    expect(payload.submitterName).toBe('Pat')
    expect(payload.user).toEqual({ id: 'u1', email: 'e@x.com' })
    expect(payload.obligations).toEqual(obligations)
    expect(payload.organisation.id).toBe('b6f76437-65b6-4ed2-a7d5-c50e9af76201')
    expect(payload.declarationText.language).toBe('en')
  })
})
