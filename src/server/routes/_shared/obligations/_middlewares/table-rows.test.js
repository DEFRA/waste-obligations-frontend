import { describe, test, expect } from 'vitest'

import {
  buildManageObligationsTableRows,
  buildObligationTables
} from './table-rows.js'

const plasticRow = {
  material: 'Plastic',
  materialKey: 'obligations.material.names.plastic',
  obligationToMeet: 75,
  awaitingAcceptance: 10,
  accepted: 50,
  outstanding: 25,
  tag: { variant: 'red', text: 'Not met' }
}

describe('buildManageObligationsTableRows', () => {
  test('links a material name to its page with a screen-reader label', () => {
    const [[nameCell]] = buildManageObligationsTableRows(
      [plasticRow],
      'en',
      () => '/producer/org-1/obligations/plastic?year=2026'
    )

    expect(nameCell.html).toContain(
      'href="/producer/org-1/obligations/plastic?year=2026"'
    )
    expect(nameCell.html).toContain('aria-labelledby="material-link-label-0"')
    expect(nameCell.html).toContain('id="material-link-label-0"')
  })

  test('leaves a material name unlinked when no page is given', () => {
    const [[nameCell]] = buildManageObligationsTableRows([plasticRow], 'en')

    expect(nameCell.html).not.toContain('<a ')
    expect(nameCell.html).toMatch(/^<strong>.+<\/strong>$/)
  })

  test('never links the totals row', () => {
    const totals = { ...plasticRow, material: 'Totals', isTotals: true }
    const [[nameCell]] = buildManageObligationsTableRows(
      [totals],
      'en',
      () => '/should-not-be-used'
    )

    expect(nameCell.html).not.toContain('<a ')
  })

  test('shows numbers as text and bolds the totals row', () => {
    const totals = { ...plasticRow, material: 'Totals', isTotals: true }
    const [, obligation, awaiting, accepted, outstanding] =
      buildManageObligationsTableRows([totals], 'en')[0]

    expect(obligation.text).toBe('75')
    expect(awaiting.text).toBe('10')
    expect(accepted.text).toBe('50')
    expect(outstanding.text).toBe('25')
    expect(obligation.classes).toBe('govuk-!-font-weight-bold')
  })

  test('puts a comma in tonnages of 1,000 or more and leaves smaller ones alone', () => {
    const large = {
      ...plasticRow,
      obligationToMeet: 17904,
      awaitingAcceptance: 999,
      accepted: 1000,
      outstanding: 4297
    }
    const [, obligation, awaiting, accepted, outstanding] =
      buildManageObligationsTableRows([large], 'en')[0]

    expect(obligation.text).toBe('17,904')
    expect(awaiting.text).toBe('999')
    expect(accepted.text).toBe('1,000')
    expect(outstanding.text).toBe('4,297')
  })

  test('formats the tonnages of a Welsh page', () => {
    const large = { ...plasticRow, obligationToMeet: 23557 }
    const [, obligation] = buildManageObligationsTableRows([large], 'cy')[0]

    expect(obligation.text).toBe('23,557')
  })

  test('shows a dash for an obligation with no data yet', () => {
    const [, obligation] = buildManageObligationsTableRows(
      [{ ...plasticRow, obligationToMeet: null }],
      'en'
    )[0]

    expect(obligation.html).toContain('govuk-visually-hidden')
    expect(obligation.html).toContain('>-<')
  })

  test('shows zero for missing awaiting and accepted counts', () => {
    const [, , awaiting, accepted] = buildManageObligationsTableRows(
      [{ ...plasticRow, awaitingAcceptance: undefined, accepted: undefined }],
      'en'
    )[0]

    expect(awaiting.text).toBe('0')
    expect(accepted.text).toBe('0')
  })

  test('renders a status tag in the last cell', () => {
    const cells = buildManageObligationsTableRows([plasticRow], 'en')[0]

    expect(cells).toHaveLength(6)
    expect(cells[5].html).toEqual(expect.any(String))
  })

  test('recolours a yellow tag red for Manage Obligations', () => {
    const cells = buildManageObligationsTableRows(
      [{ ...plasticRow, tag: { variant: 'yellow', text: 'Not met' } }],
      'en'
    )[0]
    const redCells = buildManageObligationsTableRows(
      [{ ...plasticRow, tag: { variant: 'red', text: 'Not met' } }],
      'en'
    )[0]

    expect(cells[5].html).toBe(redCells[5].html)
  })
})

describe('buildObligationTables', () => {
  test('returns the obligations and glass table rows', () => {
    const result = buildObligationTables([], 'en', () => undefined)

    expect(Array.isArray(result.obligationsTableRows)).toBe(true)
    expect(Array.isArray(result.glassTableRows)).toBe(true)
  })

  test('names glass re-melt with a hyphen on the Manage obligations page', () => {
    const glassRemelt = {
      material: 'GlassRemelt',
      recyclingTarget: 0.76,
      tonnages: { material: 50, accepted: 25, outstanding: 10, obligated: 38 },
      status: 'Met'
    }
    const result = buildObligationTables(
      [glassRemelt],
      'en',
      () => '/href',
      'obligations.home'
    )
    const names = result.glassTableRows.map((row) => row[0].html)

    expect(names.join('')).toContain('>Glass re-melt</a>')
    expect(names.join('')).not.toContain('Glass remelt')
  })

  test('gives the obligations and glass links different label ids', () => {
    const obligations = [
      {
        material: 'Plastic',
        recyclingTarget: 0.75,
        tonnages: {
          material: 100,
          awaitingAcceptance: 0,
          accepted: 50,
          outstanding: 25,
          obligated: 75
        },
        status: 'NotMet'
      },
      {
        material: 'GlassRemelt',
        recyclingTarget: 0.76,
        tonnages: {
          material: 50,
          awaitingAcceptance: 0,
          accepted: 25,
          outstanding: 10,
          obligated: 38
        },
        status: 'Met'
      }
    ]
    const result = buildObligationTables(
      obligations,
      'en',
      (row) => `/x/${row.material}`
    )
    const ids = [...result.obligationsTableRows, ...result.glassTableRows]
      .flat()
      .map((cell) => cell.html ?? '')
      .flatMap((html) => [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]))

    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.some((id) => id.startsWith('glass-material-link-label-'))).toBe(
      true
    )
  })
})
