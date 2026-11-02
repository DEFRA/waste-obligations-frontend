import { describe, expect, test } from 'vitest'

import {
  OBLIGATION_MATERIAL_SLUGS,
  obligationMaterialSlug
} from './obligation-materials.js'

describe('obligation materials', () => {
  test('lists the materials that have a calculation page', () => {
    expect(OBLIGATION_MATERIAL_SLUGS).toEqual([
      'aluminium',
      'glass',
      'paper',
      'plastic',
      'steel',
      'wood'
    ])
  })

  test.each([
    ['Aluminium', 'aluminium'],
    ['Paper', 'paper'],
    ['Plastic', 'plastic'],
    ['Steel', 'steel'],
    ['Wood', 'wood'],
    ['Glass', 'glass'],
    ['GlassRemelt', 'glass'],
    ['GlassAggregate', 'glass']
  ])('%s opens the %s page', (material, slug) => {
    expect(obligationMaterialSlug(material)).toBe(slug)
  })

  test('has no page for the totals row or an unknown material', () => {
    expect(obligationMaterialSlug('Totals')).toBeUndefined()
    expect(obligationMaterialSlug('Tin')).toBeUndefined()
  })
})
