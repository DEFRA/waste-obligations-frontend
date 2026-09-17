import { describe, expect, test } from 'vitest'

import {
  csoObligationsHomePath,
  producerObligationsHomePath
} from './obligations-paths.js'

describe('obligations paths', () => {
  test('csoObligationsHomePath builds the CSO obligations home route', () => {
    expect(csoObligationsHomePath('scheme-1')).toBe('/cso/scheme-1/obligations')
  })

  test('csoObligationsHomePath appends the year query when provided', () => {
    expect(csoObligationsHomePath('scheme-1', 2024)).toBe(
      '/cso/scheme-1/obligations?year=2024'
    )
  })

  test('producerObligationsHomePath builds the producer obligations home route', () => {
    expect(producerObligationsHomePath('org-1')).toBe(
      '/producer/org-1/obligations'
    )
  })

  test('producerObligationsHomePath appends the year query when provided', () => {
    expect(producerObligationsHomePath('org-1', 2024)).toBe(
      '/producer/org-1/obligations?year=2024'
    )
  })

  test.each([
    ['undefined', undefined],
    ['null', null],
    ['an empty string', '']
  ])('omits the year query when the year is %s', (_label, year) => {
    expect(csoObligationsHomePath('scheme-1', year)).toBe(
      '/cso/scheme-1/obligations'
    )
    expect(producerObligationsHomePath('org-1', year)).toBe(
      '/producer/org-1/obligations'
    )
  })
})
