import { describe, expect, test } from 'vitest'

import { buildCheckSelectedPrnsViewModel } from './check-selected-prns-view-model.js'

const pathId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

function buildPrn(overrides = {}) {
  return {
    id: 'prn-1',
    number: 'PRN001',
    material: 'Paper',
    tonnage: 50,
    obligationYear: 2026,
    issuedAt: '2026-11-19',
    issuer: { organisationName: 'XYZ Reprocessing' },
    ...overrides
  }
}

describe('buildCheckSelectedPrnsViewModel', () => {
  test('groups PRNs into one table per material in material filter order', () => {
    const { groups } = buildCheckSelectedPrnsViewModel({
      prns: [
        buildPrn({ id: 'prn-1', material: 'Wood' }),
        buildPrn({ id: 'prn-2', material: 'Paper' }),
        buildPrn({ id: 'prn-3', material: 'Steel' }),
        buildPrn({ id: 'prn-4', material: 'Paper' })
      ],
      pathId,
      userType: 'producer'
    })

    expect(groups.map((group) => group.heading)).toEqual([
      'Paper, board or fibre-based composite material',
      'Steel',
      'Wood'
    ])
    expect(groups[0].rows.map((row) => row.id)).toEqual(['prn-2', 'prn-4'])
  })

  test('groups paper and fibre material variants into one paper table', () => {
    const { groups } = buildCheckSelectedPrnsViewModel({
      prns: [
        buildPrn({ id: 'prn-1', material: 'Paper', tonnage: 10 }),
        buildPrn({ id: 'prn-2', material: 'PaperBoard', tonnage: 20 }),
        buildPrn({ id: 'prn-3', material: 'FibreComposite', tonnage: 30 }),
        buildPrn({ id: 'prn-4', material: 'fiber-based', tonnage: 40 }),
        buildPrn({ id: 'prn-5', material: 'Steel', tonnage: 5 })
      ],
      pathId,
      userType: 'producer'
    })

    expect(groups.map((group) => group.heading)).toEqual([
      'Paper, board or fibre-based composite material',
      'Steel'
    ])
    expect(groups[0].rows.map((row) => row.id)).toEqual([
      'prn-1',
      'prn-2',
      'prn-3',
      'prn-4'
    ])
    expect(groups[0].totalTonnage).toBe(100)
  })

  test('totals the tonnage selected for each material', () => {
    const { groups } = buildCheckSelectedPrnsViewModel({
      prns: [
        buildPrn({ id: 'prn-1', tonnage: 50 }),
        buildPrn({ id: 'prn-2', tonnage: 170 }),
        buildPrn({ id: 'prn-3', material: 'Steel', tonnage: 50 })
      ],
      pathId,
      userType: 'producer'
    })

    expect(groups.map((group) => group.totalTonnage)).toEqual([220, 50])
  })

  test('builds each row with number, link, date issued, issuer and tonnage', () => {
    const { groups } = buildCheckSelectedPrnsViewModel({
      prns: [buildPrn()],
      pathId,
      userType: 'producer',
      year: 2026
    })

    expect(groups[0].rows[0]).toEqual({
      id: 'prn-1',
      number: 'PRN001',
      href: `/producer/${pathId}/prns/prn-1?year=2026`,
      issuedAt: '19 Nov 2026',
      issuer: 'XYZ Reprocessing',
      tonnage: 50
    })
  })

  test('links CSO rows to the CSO PRN page, falling back to the PRN year', () => {
    const { groups } = buildCheckSelectedPrnsViewModel({
      prns: [buildPrn({ obligationYear: 2025 })],
      pathId,
      userType: 'cso'
    })

    expect(groups[0].rows[0].href).toBe(`/cso/${pathId}/prns/prn-1?year=2025`)
  })

  test("links each row using the PRN's own obligation year, not a stale page year", () => {
    const { groups } = buildCheckSelectedPrnsViewModel({
      prns: [
        buildPrn({ id: 'prn-1', obligationYear: 2026 }),
        buildPrn({ id: 'prn-2', obligationYear: 2027 })
      ],
      pathId,
      userType: 'producer',
      // A selection made for 2026 being rendered under a different year's
      // query, eg via a stale link or back-button navigation.
      year: 2028
    })

    expect(groups[0].rows.map((row) => row.href)).toEqual([
      `/producer/${pathId}/prns/prn-1?year=2026`,
      `/producer/${pathId}/prns/prn-2?year=2027`
    ])
  })

  test('falls back to the page year when a PRN has no obligation year of its own', () => {
    const { groups } = buildCheckSelectedPrnsViewModel({
      prns: [buildPrn({ obligationYear: undefined })],
      pathId,
      userType: 'producer',
      year: 2026
    })

    expect(groups[0].rows[0].href).toBe(
      `/producer/${pathId}/prns/prn-1?year=2026`
    )
  })

  test('prefixes PRN links with the X-Forwarded-Prefix', () => {
    const { groups } = buildCheckSelectedPrnsViewModel({
      prns: [buildPrn()],
      pathId,
      userType: 'producer',
      year: 2026,
      request: {
        headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
      }
    })

    expect(groups[0].rows[0].href).toBe(
      `/manage-recycling-obligations/producer/${pathId}/prns/prn-1?year=2026`
    )
  })

  test('copes with missing optional PRN fields', () => {
    const { groups } = buildCheckSelectedPrnsViewModel({
      prns: [
        {
          id: 'prn-1',
          number: 'PRN001',
          material: undefined,
          issuedAt: undefined,
          issuer: undefined,
          tonnage: undefined
        }
      ],
      pathId,
      userType: 'producer'
    })

    expect(groups[0]).toMatchObject({
      material: '',
      heading: 'Not provided',
      totalTonnage: 0
    })
    expect(groups[0].rows[0]).toMatchObject({
      issuedAt: '',
      issuer: '',
      tonnage: 0
    })
  })

  test('places unknown materials after known ones, alphabetically', () => {
    const { groups } = buildCheckSelectedPrnsViewModel({
      prns: [
        buildPrn({ id: 'prn-1', material: 'Zinc' }),
        buildPrn({ id: 'prn-2', material: 'Copper' }),
        buildPrn({ id: 'prn-3', material: 'Wood' })
      ],
      pathId,
      userType: 'producer'
    })

    expect(groups.map((group) => group.heading)).toEqual([
      'Wood',
      'Copper',
      'Zinc'
    ])
  })

  test('returns no groups when nothing is selected', () => {
    expect(
      buildCheckSelectedPrnsViewModel({ pathId, userType: 'producer' })
    ).toEqual({ groups: [] })
  })
})
