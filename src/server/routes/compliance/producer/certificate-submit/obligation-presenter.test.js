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
  test('builds main rows with aggregate glass, sorted like manage-your-recycling-obligations', () => {
    const { overallStatus, obligationsRows, glassRows } =
      presentObligationsForCertificateSubmit(
        sampleObligationsPayload.obligations
      )

    expect(overallStatus).toBe('NotMet')
    const plastic = obligationsRows.find(
      (r) =>
        r.materialKey ===
        'compliance.components.obligationsTable.material.plastic'
    )
    expect(plastic?.obligationToMeet).toBe(75)
    expect(plastic?.status).toBe('Met')
    expect(
      obligationsRows.find((r) => r.materialKey?.includes('glassRemelt'))
    ).toBeUndefined()
    expect(
      obligationsRows.find(
        (r) =>
          r.materialKey ===
          'compliance.components.obligationsTable.material.glassRemaining'
      )
    ).toBeUndefined()

    const aggregateGlass = obligationsRows.find(
      (r) =>
        r.materialKey ===
        'compliance.components.obligationsTable.material.glass'
    )
    expect(aggregateGlass).toMatchObject({
      obligationToMeet: 20,
      awaitingAcceptance: 0,
      accepted: 25,
      outstanding: 5,
      status: 'NotMet'
    })

    const materialRows = obligationsRows.filter(
      (r) =>
        r.materialKey !==
        'compliance.components.obligationsTable.table.totalsRow'
    )
    expect(materialRows.map((r) => r.materialKey)).toEqual([
      'compliance.components.obligationsTable.material.glass',
      'compliance.components.obligationsTable.material.plastic'
    ])

    expect(obligationsRows.at(-1)?.materialKey).toBe(
      'compliance.components.obligationsTable.table.totalsRow'
    )
    expect(glassRows).toHaveLength(3)
    expect(glassRows[0].materialKey).toBe(
      'compliance.components.obligationsTable.material.glassRemelt'
    )
    expect(glassRows[1].materialKey).toBe(
      'compliance.components.obligationsTable.material.glassRemaining'
    )
  })

  test('sorts all main-table materials alphabetically by material name', () => {
    const { obligationsRows } = presentObligationsForCertificateSubmit([
      { material: 'Wood', tonnages: { obligated: 1 }, status: 'Met' },
      { material: 'Paper', tonnages: { obligated: 2 }, status: 'Met' },
      { material: 'Steel', tonnages: { obligated: 3 }, status: 'Met' },
      { material: 'Aluminium', tonnages: { obligated: 4 }, status: 'Met' },
      {
        material: 'GlassRemelt',
        tonnages: { obligated: 5 },
        status: 'Met'
      },
      { material: 'Glass', tonnages: { obligated: 6 }, status: 'Met' }
    ])

    const materialRows = obligationsRows.filter(
      (r) =>
        r.materialKey !==
        'compliance.components.obligationsTable.table.totalsRow'
    )

    expect(materialRows.map((r) => r.material)).toEqual([
      'Aluminium',
      'GlassAggregate',
      'Paper',
      'Steel',
      'Wood'
    ])
  })

  test('maps Aluminium to the British spelling locale key', () => {
    const { obligationsRows } = presentObligationsForCertificateSubmit([
      {
        material: 'Aluminium',
        tonnages: {
          obligated: 10,
          awaitingAcceptance: 0,
          accepted: 10,
          outstanding: 0
        },
        status: 'Met'
      }
    ])

    expect(obligationsRows[0].materialKey).toBe(
      'compliance.components.obligationsTable.material.aluminium'
    )
  })

  test('defaults missing tonnage values to zero', () => {
    const { obligationsRows } = presentObligationsForCertificateSubmit([
      {
        material: 'Steel',
        tonnages: {},
        status: 'NoDataYet'
      }
    ])

    const steelRow = obligationsRows.find((r) => r.material === 'Steel')
    expect(steelRow).toMatchObject({
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
    })
  })

  test('reports overall NoDataYet when only NoDataYet glass breakdown rows exist', () => {
    const { overallStatus, glassRows } = presentObligationsForCertificateSubmit(
      [
        {
          material: 'GlassRemelt',
          tonnages: { obligated: 0 },
          status: 'NoDataYet'
        },
        {
          material: 'Glass',
          tonnages: { obligated: 0 },
          status: 'NoDataYet'
        }
      ]
    )

    expect(overallStatus).toBe('NoDataYet')
    expect(glassRows.at(-1)?.status).toBe('NoDataYet')
  })

  test('treats empty obligations as Met with zero totals and aggregate glass', () => {
    const { overallStatus, obligationsRows, glassRows } =
      presentObligationsForCertificateSubmit([])

    expect(overallStatus).toBe('Met')
    expect(obligationsRows).toHaveLength(2)
    expect(obligationsRows[0].materialKey).toBe(
      'compliance.components.obligationsTable.material.glass'
    )
    expect(obligationsRows[0].tag.variant).toBe('green')
    expect(obligationsRows[1].materialKey).toBe(
      'compliance.components.obligationsTable.table.totalsRow'
    )
    expect(glassRows).toHaveLength(3)
    expect(glassRows[0].obligationToMeet).toBe(0)
    expect(glassRows[0].status).toBe('Met')
  })

  test('treats null obligations as an empty list', () => {
    const { overallStatus, obligationsRows } =
      presentObligationsForCertificateSubmit(null)

    expect(overallStatus).toBe('Met')
    expect(obligationsRows).toHaveLength(2)
  })

  test('handles unknown materials when building and sorting rows', () => {
    const { obligationsRows } = presentObligationsForCertificateSubmit([
      { material: 'Copper', tonnages: { obligated: 1 }, status: 'Met' },
      { material: 'Paper', tonnages: { obligated: 2 }, status: 'Met' }
    ])

    const materialRows = obligationsRows.filter(
      (row) =>
        row.materialKey !==
        'compliance.components.obligationsTable.table.totalsRow'
    )

    expect(materialRows.map((row) => row.material)).toContain('Copper')
    expect(
      materialRows.find((row) => row.material === 'Copper')?.materialKey
    ).toBeUndefined()
  })
})

describe('obligationStatusI18nKey', () => {
  test('returns the locale key for Met and NotMet', () => {
    expect(obligationStatusI18nKey('Met')).toBe(
      'compliance.components.obligationsTable.obligationStatus.met'
    )
    expect(obligationStatusI18nKey('NotMet')).toBe(
      'compliance.components.obligationsTable.obligationStatus.notMet'
    )
  })

  test('resolves page-specific status keys when pageLocaleBase is provided', () => {
    expect(
      obligationStatusI18nKey('NotMet', 'en', 'compliance.certificateView')
    ).toBe(
      'compliance.certificateView.components.obligationsTable.obligationStatus.notMet'
    )
  })

  test('returns null for NoDataYet, unknown, and missing values', () => {
    expect(obligationStatusI18nKey('NoDataYet')).toBeNull()
    expect(obligationStatusI18nKey('Pending')).toBeNull()
    expect(obligationStatusI18nKey(undefined)).toBeNull()
    expect(obligationStatusI18nKey(null)).toBeNull()
  })
})

describe('presentObligationsForCertificateSubmit page locale', () => {
  test('resolves status tag keys from the page locale base', () => {
    const { obligationsRows } = presentObligationsForCertificateSubmit(
      [
        {
          material: 'Wood',
          tonnages: { obligated: 1 },
          status: 'NotMet'
        }
      ],
      { locale: 'en', pageLocaleBase: 'compliance.certificateView' }
    )

    const woodRow = obligationsRows.find((row) => row.material === 'Wood')

    expect(woodRow.tag).toEqual({
      variant: 'yellow',
      i18nKey:
        'compliance.certificateView.components.obligationsTable.obligationStatus.notMet'
    })
  })
})
