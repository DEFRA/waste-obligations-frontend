import { describe, expect, test } from 'vitest'

import { buildPrnsViewModel } from './prns-view-model.js'

const pathId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const now = new Date('2026-06-01T12:00:00Z')

function buildPrn(overrides = {}) {
  return {
    id: 'prn-1',
    number: 'PRN123',
    type: 'PRN',
    status: 'AwaitingAcceptance',
    material: 'Plastic',
    tonnage: 75,
    obligationYear: 2026,
    decemberWaste: false,
    issuedAt: '2026-04-02',
    issuer: { organisationName: 'Reprocessor Ltd' },
    additionalNotes: 'Ref 345678F',
    ...overrides
  }
}

describe('buildPrnsViewModel', () => {
  test('exposes ordered columns whose keys match the row cell keys', () => {
    const model = buildPrnsViewModel({
      prns: [buildPrn()],
      pathId,
      userType: 'producer',
      locale: 'en',
      now
    })

    expect(model.classes).toBe('app-prns-table')
    expect(model.columns).toEqual([
      { key: 'number', heading: 'PRN or PERN number' },
      { key: 'material', heading: 'Material' },
      { key: 'issuedAt', heading: 'Date issued' },
      { key: 'decemberWaste', heading: 'December waste' },
      { key: 'issuer', heading: 'Issued by' },
      { key: 'tonnage', heading: 'Tonnage' },
      { key: 'issuerNote', heading: 'Issuer note' }
    ])

    const [row] = model.rows
    expect(Object.keys(row).filter((key) => key !== 'canMultiSelect')).toEqual(
      model.columns.map((column) => column.key)
    )
  })

  test('builds a selectable row for a standard awaiting-acceptance PRN', () => {
    const model = buildPrnsViewModel({
      prns: [buildPrn()],
      pathId,
      userType: 'cso',
      locale: 'en',
      now
    })

    expect(model.count).toBe(1)
    expect(model.showAcceptSelectedButton).toBe(true)
    expect(model.rows[0].canMultiSelect).toBe(true)
    expect(model.rows[0].material).toEqual({ text: 'Plastic' })
    expect(model.rows[0].issuedAt).toEqual({ text: '02 Apr 2026' })
    expect(model.rows[0].decemberWaste).toEqual({ text: 'No' })
    expect(model.rows[0].issuer).toEqual({ text: 'Reprocessor Ltd' })
    expect(model.rows[0].tonnage).toEqual({ text: 75, format: 'numeric' })
    expect(model.rows[0].issuerNote).toEqual({ text: 'Ref 345678F' })
    expect(model.rows[0].number.html).toContain('type="checkbox"')
    expect(model.rows[0].number.html).toContain(
      `href="/cso/${pathId}/prns/prn-1?year=2026"`
    )
    expect(model.rows[0].number.html).toContain('PRN123')
  })

  test('omits the checkbox for December waste with a multi-year choice', () => {
    const model = buildPrnsViewModel({
      prns: [
        buildPrn({
          decemberWaste: true,
          obligationYear: 2026,
          issuedAt: '2026-12-20'
        })
      ],
      pathId,
      userType: 'producer',
      locale: 'en',
      now: new Date('2026-12-15T12:00:00Z')
    })

    expect(model.rows[0].canMultiSelect).toBe(false)
    expect(model.showAcceptSelectedButton).toBe(false)
    expect(model.rows[0].number.html).not.toContain('type="checkbox"')
    expect(model.rows[0].number.html).toContain(
      `<a class="govuk-link" href="/producer/${pathId}/prns/prn-1?year=2026">PRN123</a>`
    )
    expect(model.rows[0].decemberWaste).toEqual({ text: 'Yes' })
  })

  test('shows the accept-selected button when any row is multi-selectable', () => {
    const model = buildPrnsViewModel({
      prns: [
        buildPrn({
          id: 'prn-multi',
          decemberWaste: true,
          obligationYear: 2026
        }),
        buildPrn({ id: 'prn-std', number: 'STD1' })
      ],
      pathId,
      userType: 'producer',
      locale: 'en',
      now: new Date('2026-12-15T12:00:00Z')
    })

    expect(model.showAcceptSelectedButton).toBe(true)
  })

  test('uses Not provided when issuer note is missing', () => {
    const model = buildPrnsViewModel({
      prns: [buildPrn({ additionalNotes: null })],
      pathId,
      userType: 'producer',
      locale: 'en',
      now
    })

    expect(model.rows[0].issuerNote).toEqual({ text: 'Not provided' })
  })

  test('defaults to an empty table when given no PRNs', () => {
    const model = buildPrnsViewModel({
      pathId,
      userType: 'producer',
      locale: 'en',
      now
    })

    expect(model.rows).toEqual([])
    expect(model.count).toBe(0)
    expect(model.showAcceptSelectedButton).toBe(false)
    expect(model.columns).toHaveLength(7)
  })

  test('keeps the list year on the row link when it differs from the PRN year', () => {
    const model = buildPrnsViewModel({
      prns: [buildPrn({ obligationYear: 2024 })],
      pathId,
      userType: 'producer',
      locale: 'en',
      now,
      request: { query: { year: 2026 } }
    })

    expect(model.rows[0].number.html).toContain(
      `href="/producer/${pathId}/prns/prn-1?year=2026"`
    )
  })

  test('omits the year query when neither the list nor the PRN has a year', () => {
    const model = buildPrnsViewModel({
      prns: [buildPrn({ obligationYear: undefined })],
      pathId,
      userType: 'producer',
      locale: 'en',
      now
    })

    expect(model.rows[0].number.html).toContain(
      `href="/producer/${pathId}/prns/prn-1"`
    )
    expect(model.rows[0].number.html).not.toContain('year=')
  })

  test('escapes the PRN number in the checkbox id and link text', () => {
    const model = buildPrnsViewModel({
      prns: [
        buildPrn({
          id: 'prn-"1"',
          number: 'PRN<a>"x'
        })
      ],
      pathId,
      userType: 'producer',
      locale: 'en',
      now
    })

    expect(model.rows[0].number.html).toContain('PRN&lt;a&gt;&quot;x')
    expect(model.rows[0].number.html).toContain(
      'id="prn-select-prn-&quot;1&quot;"'
    )
    expect(model.rows[0].number.html).not.toContain('PRN<a>"x')
  })

  test('uses blank text when material or issued date is missing', () => {
    const model = buildPrnsViewModel({
      prns: [buildPrn({ material: null, issuedAt: null })],
      pathId,
      userType: 'producer',
      locale: 'en',
      now
    })

    expect(model.rows[0].material).toEqual({ text: '' })
    expect(model.rows[0].issuedAt).toEqual({ text: '' })
  })
})
