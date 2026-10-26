import { describe, expect, test } from 'vitest'

import { groupPrnsByMaterial } from './group-prns-by-material.js'

describe('groupPrnsByMaterial', () => {
  test('groups PRNs by material in material filter order, totalling the tonnage', () => {
    const prns = [
      { material: 'Wood', tonnage: 7 },
      { material: 'Plastic', tonnage: 50 },
      { material: 'FibreComposite', tonnage: 5 },
      { material: 'Plastic', tonnage: 25 }
    ]

    expect(groupPrnsByMaterial(prns)).toEqual([
      {
        material: 'Paper',
        heading: 'Paper, board or fibre-based composite material',
        totalTonnage: 5,
        prns: [prns[2]]
      },
      {
        material: 'Plastic',
        heading: 'Plastic',
        totalTonnage: 75,
        prns: [prns[1], prns[3]]
      },
      { material: 'Wood', heading: 'Wood', totalTonnage: 7, prns: [prns[0]] }
    ])
  })

  test('places unknown and missing materials after known ones, alphabetically', () => {
    const groups = groupPrnsByMaterial([
      { material: 'Zinc', tonnage: 1 },
      {},
      { material: 'Steel', tonnage: 2 }
    ])

    expect(
      groups.map(({ heading, totalTonnage }) => [heading, totalTonnage])
    ).toEqual([
      ['Steel', 2],
      ['Not provided', 0],
      ['Zinc', 1]
    ])
  })

  test('returns no groups for no PRNs', () => {
    expect(groupPrnsByMaterial()).toEqual([])
  })
})
