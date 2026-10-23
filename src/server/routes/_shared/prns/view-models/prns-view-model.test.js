import { describe, expect, test } from 'vitest'

import { translate } from '#/server/common/helpers/i18n/translate.js'

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
    const nonCellKeys = ['canMultiSelect', 'decemberWasteFlash']
    expect(
      Object.keys(row).filter((key) => !nonCellKeys.includes(key))
    ).toEqual(model.columns.map((column) => column.key))
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
    expect(model.rows[0].tonnage).toEqual({ text: '75', format: 'numeric' })
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

  test('flags the row to show the December waste flash label with both years', () => {
    const model = buildPrnsViewModel({
      prns: [
        buildPrn({
          decemberWaste: true,
          obligationYear: 2026,
          issuedAt: '2026-12-05',
          accreditationYear: 2026
        })
      ],
      pathId,
      userType: 'producer',
      locale: 'en',
      now: new Date('2026-12-15T12:00:00Z')
    })

    expect(model.rows[0].decemberWasteFlash).toEqual({
      show: true,
      text: 'Can be accepted towards 2026 or 2027'
    })
  })

  test('does not show the December waste flash for a standard PRN', () => {
    // Inside the window with an in-window issue date, so only the PRN not
    // being December waste can hide the flash.
    const model = buildPrnsViewModel({
      prns: [
        buildPrn({
          decemberWaste: false,
          issuedAt: '2026-12-05',
          accreditationYear: 2026
        })
      ],
      pathId,
      userType: 'producer',
      locale: 'en',
      now: new Date('2026-12-15T12:00:00Z')
    })

    expect(model.rows[0].decemberWasteFlash).toEqual({ show: false, text: '' })
  })

  test('does not show the December waste flash once the PRN has been accepted', () => {
    const model = buildPrnsViewModel({
      prns: [
        buildPrn({
          status: 'Accepted',
          decemberWaste: true,
          obligationYear: 2026,
          issuedAt: '2026-12-05',
          accreditationYear: 2026
        })
      ],
      pathId,
      userType: 'producer',
      locale: 'en',
      now: new Date('2026-12-15T12:00:00Z')
    })

    expect(model.rows[0].decemberWasteFlash).toEqual({ show: false, text: '' })
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

  test.each([null, undefined, '', '   '])(
    'uses Not provided when issuer note is %j',
    (additionalNotes) => {
      const model = buildPrnsViewModel({
        prns: [buildPrn({ additionalNotes })],
        pathId,
        userType: 'producer',
        locale: 'en',
        now
      })

      expect(model.rows[0].issuerNote).toEqual({ text: 'Not provided' })
    }
  )

  test.each([undefined, {}])(
    'defaults the issuer cell to empty text when issuer is %j',
    (issuer) => {
      const model = buildPrnsViewModel({
        prns: [buildPrn({ issuer })],
        pathId,
        userType: 'producer',
        locale: 'en',
        now
      })

      expect(model.rows[0].issuer).toEqual({ text: '' })
    }
  )

  test('calculates the results range from page, pageSize and row count', () => {
    const model = buildPrnsViewModel({
      prns: [buildPrn()],
      pathId,
      userType: 'producer',
      locale: 'en',
      now,
      page: 2,
      pageSize: 20
    })

    expect(model.count).toBe(1)
    expect(model.resultsFrom).toBe(21)
    expect(model.resultsTo).toBe(21)
  })

  test('defaults the results range to the current rows when page is omitted', () => {
    const model = buildPrnsViewModel({
      prns: [buildPrn(), buildPrn({ id: 'prn-2', number: 'PRN124' })],
      pathId,
      userType: 'producer',
      locale: 'en',
      now
    })

    expect(model.resultsFrom).toBe(1)
    expect(model.resultsTo).toBe(2)
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
    expect(model.resultsFrom).toBe(0)
    expect(model.resultsTo).toBe(0)
    expect(model.showAcceptSelectedButton).toBe(false)
    expect(model.columns).toHaveLength(7)
    expect(model.hasMaterialFilter).toBe(false)
  })

  test('flags a material filter so an empty result is not read as "none awaiting acceptance"', () => {
    const model = buildPrnsViewModel({
      pathId,
      userType: 'producer',
      locale: 'en',
      now,
      request: { query: { material: 'Glass' } }
    })

    expect(model.rows).toEqual([])
    expect(model.hasMaterialFilter).toBe(true)
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

  test('names each row material from prns.list.material', () => {
    const model = buildPrnsViewModel({
      prns: [
        buildPrn({ id: 'prn-1', material: 'Aluminium' }),
        buildPrn({ id: 'prn-2', material: 'Fibre' }),
        buildPrn({ id: 'prn-3', material: 'Glass' }),
        buildPrn({ id: 'prn-4', material: 'GlassRemelt' }),
        buildPrn({ id: 'prn-5', material: 'Paper' }),
        buildPrn({ id: 'prn-6', material: 'Plastic' }),
        buildPrn({ id: 'prn-7', material: 'Steel' }),
        buildPrn({ id: 'prn-8', material: 'Wood' })
      ],
      pathId,
      userType: 'producer',
      locale: 'en',
      now
    })

    expect(model.rows.map((row) => row.material.text)).toEqual(
      [
        'aluminium',
        'fibre',
        'glassOther',
        'glassRemelt',
        'paper',
        'plastic',
        'steel',
        'wood'
      ].map((key) => translate('en', `prns.list.material.${key}`))
    )
  })

  test('row material names read in the API material order', () => {
    // The list sorts by the backend's material name, so the names shown must
    // keep that order for "Material (A to Z)" to read alphabetically.
    const model = buildPrnsViewModel({
      prns: [
        'Aluminium',
        'Fibre',
        'Glass',
        'GlassRemelt',
        'Paper',
        'Plastic',
        'Steel',
        'Wood'
      ].map((material, index) => buildPrn({ id: `prn-${index}`, material })),
      pathId,
      userType: 'producer',
      locale: 'en',
      now
    })
    const names = model.rows.map((row) => row.material.text)

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })

  test('shows a material with no prns.list.material key as the API names it', () => {
    const model = buildPrnsViewModel({
      prns: [buildPrn({ material: 'Copper' })],
      pathId,
      userType: 'producer',
      locale: 'en',
      now
    })

    expect(model.rows[0].material.text).toBe('Copper')
  })

  test('names row materials in the requested language', () => {
    const model = buildPrnsViewModel({
      prns: [buildPrn({ material: 'Paper' })],
      pathId,
      userType: 'producer',
      locale: 'cy',
      now
    })

    expect(model.rows[0].material.text).toBe(
      translate('cy', 'prns.list.material.paper')
    )
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

  test('builds pagination from total, page and pageSize and keeps pageSize on the sort/filter form', () => {
    const model = buildPrnsViewModel({
      prns: [],
      pathId,
      userType: 'producer',
      page: 2,
      pageSize: 10,
      total: 35,
      request: { query: { pageSize: 10, page: 2 } }
    })

    expect(model.pagination.items.map((i) => i.number)).toEqual([1, 2, 3, 4])
    expect(model.sortFilter.pageSize).toBe(10)
  })

  test('omits pagination when everything fits on one page', () => {
    const model = buildPrnsViewModel({
      prns: [],
      pathId,
      userType: 'producer',
      page: 1,
      pageSize: 20,
      total: 5
    })

    expect(model.pagination).toBeNull()
  })
})
