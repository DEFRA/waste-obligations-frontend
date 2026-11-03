import { describe, expect, test } from 'vitest'

import {
  OBLIGATION_MATERIAL_SLUGS,
  obligationMaterialAriaLabelKey,
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

  test.each([
    ['Aluminium', 'aluminium'],
    ['Paper', 'paper'],
    ['Plastic', 'plastic'],
    ['Steel', 'steel'],
    ['Wood', 'wood'],
    ['GlassAggregate', 'glass'],
    ['GlassRemelt', 'glassRemelt'],
    ['Glass', 'remainingGlass']
  ])('%s has the %s screen reader label', (material, key) => {
    expect(obligationMaterialAriaLabelKey(material)).toBe(key)
  })

  test('every material with a page has a screen reader label', () => {
    for (const material of [
      'Aluminium',
      'Paper',
      'Plastic',
      'Steel',
      'Wood',
      'Glass',
      'GlassRemelt',
      'GlassAggregate'
    ]) {
      expect(obligationMaterialSlug(material)).toBeDefined()
      expect(obligationMaterialAriaLabelKey(material)).toBeDefined()
    }
  })

  test('has no screen reader label for the totals row', () => {
    expect(obligationMaterialAriaLabelKey('Totals')).toBeUndefined()
  })
})
