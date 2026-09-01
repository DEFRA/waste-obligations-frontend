import { describe, expect, test } from 'vitest'

import { PrnsViewModel } from './prns-view-model.js'

const pathId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

function buildPrn(overrides = {}) {
  return {
    id: 'prn-1',
    number: 'PRN123',
    type: 'PRN',
    status: 'Accepted',
    material: 'Plastic',
    tonnage: 75,
    obligationYear: 2026,
    issuedAt: '2026-04-02',
    issuer: { organisationName: 'Reprocessor Ltd' },
    ...overrides
  }
}

describe('PrnsViewModel', () => {
  test('exposes ordered columns whose keys match the row cell keys', () => {
    const model = new PrnsViewModel({
      prns: [buildPrn()],
      pathId,
      userType: 'producer',
      locale: 'en'
    })

    expect(model.classes).toBe('app-prns-table')
    expect(model.columns).toEqual([
      { key: 'number', heading: 'Number' },
      { key: 'type', heading: 'Type' },
      { key: 'status', heading: 'Status' },
      { key: 'material', heading: 'Material' },
      { key: 'tonnage', heading: 'Tonnage' },
      { key: 'issuedAt', heading: 'Date issued' },
      { key: 'issuer', heading: 'Issuer' },
      { key: 'view', heading: 'View' }
    ])

    const [row] = model.rows
    expect(Object.keys(row)).toEqual(model.columns.map((column) => column.key))
  })

  test('builds a fully populated row', () => {
    const model = new PrnsViewModel({
      prns: [buildPrn()],
      pathId,
      userType: 'cso',
      locale: 'en'
    })

    expect(model.count).toBe(1)
    expect(model.rows[0]).toEqual({
      number: { text: 'PRN123' },
      type: { text: 'PRN' },
      status: { text: 'Accepted' },
      material: { text: 'Plastic' },
      tonnage: { text: 75 },
      issuedAt: { text: '02 Apr 2026' },
      issuer: { text: 'Reprocessor Ltd' },
      view: {
        html: `<a class="govuk-link" href="/organisations/cso/${pathId}/prns/prn-1?year=2026">View</a>`
      }
    })
  })

  test('falls back to the raw status and blank fields when data is missing', () => {
    const model = new PrnsViewModel({
      prns: [
        buildPrn({
          status: 'SomeUnmappedStatus',
          issuedAt: null,
          issuer: null
        })
      ],
      userType: 'producer',
      pathId,
      locale: 'en'
    })

    const [row] = model.rows
    expect(row.status).toEqual({ text: 'SomeUnmappedStatus' })
    expect(row.issuedAt).toEqual({ text: '' })
    expect(row.issuer).toEqual({ text: '' })
  })

  test('defaults to an empty table when given no PRNs', () => {
    const model = new PrnsViewModel({
      pathId,
      userType: 'producer',
      locale: 'en'
    })

    expect(model.rows).toEqual([])
    expect(model.count).toBe(0)
    expect(model.columns).toHaveLength(8)
  })
})
