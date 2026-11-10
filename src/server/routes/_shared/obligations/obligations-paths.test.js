import { describe, expect, test } from 'vitest'

import {
  csoComplianceRecordPath,
  csoObligationMaterialPath,
  csoObligationsHomePath,
  producerComplianceRecordPath,
  producerObligationMaterialPath,
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

  test('producerObligationMaterialPath builds the producer material route with the year', () => {
    expect(producerObligationMaterialPath('org-1', 'aluminium', 2026)).toBe(
      '/producer/org-1/obligations/aluminium?year=2026'
    )
  })

  test('csoObligationMaterialPath builds the CSO material route with the year', () => {
    expect(csoObligationMaterialPath('scheme-1', 'glass', 2026)).toBe(
      '/cso/scheme-1/obligations/glass?year=2026'
    )
  })

  test('producerComplianceRecordPath builds the producer compliance record route', () => {
    expect(producerComplianceRecordPath('org-1')).toBe(
      '/producer/org-1/obligations/compliance-record'
    )
  })

  test('csoComplianceRecordPath builds the CSO compliance record route', () => {
    expect(csoComplianceRecordPath('scheme-1')).toBe(
      '/cso/scheme-1/obligations/compliance-record'
    )
  })
})
