import { describe, expect, test } from 'vitest'

import {
  acceptPrnPath,
  rejectPrnPath,
  producerPrnsPath,
  producerPrnPath,
  producerConfirmAcceptPrnPath,
  producerCheckSelectedPrnsPath,
  csoPrnsPath,
  csoPrnPath,
  csoConfirmAcceptPrnPath,
  csoCheckSelectedPrnsPath,
  producerChooseYearPrnPath,
  csoChooseYearPrnPath
} from './prns-paths.js'

describe('prns paths', () => {
  test('producerCheckSelectedPrnsPath builds the check-selection route', () => {
    expect(producerCheckSelectedPrnsPath('org-1')).toBe(
      '/producer/org-1/prns/check-selection'
    )
    expect(producerCheckSelectedPrnsPath('org-1', 2026)).toBe(
      '/producer/org-1/prns/check-selection?year=2026'
    )
  })

  test('csoCheckSelectedPrnsPath builds the check-selection route', () => {
    expect(csoCheckSelectedPrnsPath('scheme-1')).toBe(
      '/cso/scheme-1/prns/check-selection'
    )
    expect(csoCheckSelectedPrnsPath('scheme-1', 2026)).toBe(
      '/cso/scheme-1/prns/check-selection?year=2026'
    )
  })

  test('acceptPrnPath builds the selected-prn route', () => {
    expect(acceptPrnPath('org-1', 'prn-1')).toBe('/producer/org-1/prns/prn-1')
  })

  test('rejectPrnPath builds the same selected-prn route', () => {
    expect(rejectPrnPath('org-1', 'prn-1')).toBe('/producer/org-1/prns/prn-1')
  })

  test('producerPrnsPath builds the producer PRNs list route', () => {
    expect(producerPrnsPath('org-1')).toBe('/producer/org-1/prns')
  })

  test('producerPrnsPath appends the year query when provided', () => {
    expect(producerPrnsPath('org-1', 2024)).toBe(
      '/producer/org-1/prns?year=2024'
    )
  })

  test('producerPrnPath builds the single PRN route', () => {
    expect(producerPrnPath('org-1', 'prn-1')).toBe('/producer/org-1/prns/prn-1')
  })

  test('producerPrnPath appends the year query when provided', () => {
    expect(producerPrnPath('org-1', 'prn-1', 2024)).toBe(
      '/producer/org-1/prns/prn-1?year=2024'
    )
  })

  test('producerConfirmAcceptPrnPath builds the confirm-accept route', () => {
    expect(producerConfirmAcceptPrnPath('org-1', 'prn-1')).toBe(
      '/producer/org-1/prns/prn-1/confirm-accept'
    )
  })

  test('producerConfirmAcceptPrnPath appends the year query when provided', () => {
    expect(producerConfirmAcceptPrnPath('org-1', 'prn-1', 2024)).toBe(
      '/producer/org-1/prns/prn-1/confirm-accept?year=2024'
    )
  })

  test('csoPrnsPath builds the CSO PRNs list route', () => {
    expect(csoPrnsPath('scheme-1')).toBe('/cso/scheme-1/prns')
  })

  test('csoPrnsPath appends the year query when provided', () => {
    expect(csoPrnsPath('scheme-1', 2024)).toBe('/cso/scheme-1/prns?year=2024')
  })

  test('csoPrnPath builds the single PRN route', () => {
    expect(csoPrnPath('scheme-1', 'prn-1')).toBe('/cso/scheme-1/prns/prn-1')
  })

  test('csoPrnPath appends the year query when provided', () => {
    expect(csoPrnPath('scheme-1', 'prn-1', 2024)).toBe(
      '/cso/scheme-1/prns/prn-1?year=2024'
    )
  })

  test('csoConfirmAcceptPrnPath builds the confirm-accept route', () => {
    expect(csoConfirmAcceptPrnPath('scheme-1', 'prn-1')).toBe(
      '/cso/scheme-1/prns/prn-1/confirm-accept'
    )
  })

  test('csoConfirmAcceptPrnPath appends the year query when provided', () => {
    expect(csoConfirmAcceptPrnPath('scheme-1', 'prn-1', 2024)).toBe(
      '/cso/scheme-1/prns/prn-1/confirm-accept?year=2024'
    )
  })

  describe('year query handling', () => {
    test.each([
      ['undefined', undefined],
      ['null', null],
      ['an empty string', '']
    ])('omits the year query when the year is %s', (_label, year) => {
      expect(producerPrnPath('org-1', 'prn-1', year)).toBe(
        '/producer/org-1/prns/prn-1'
      )
      expect(csoPrnPath('scheme-1', 'prn-1', year)).toBe(
        '/cso/scheme-1/prns/prn-1'
      )
      expect(producerPrnsPath('org-1', year)).toBe('/producer/org-1/prns')
      expect(csoPrnsPath('scheme-1', year)).toBe('/cso/scheme-1/prns')
    })

    test('keeps a year of 0', () => {
      expect(producerPrnPath('org-1', 'prn-1', 0)).toBe(
        '/producer/org-1/prns/prn-1?year=0'
      )
    })
  })
})

describe('choose-year paths and acceptYear', () => {
  test('producerChooseYearPrnPath builds the route with optional year', () => {
    expect(producerChooseYearPrnPath('org-1', 'prn-1')).toBe(
      '/producer/org-1/prns/prn-1/choose-year'
    )
    expect(producerChooseYearPrnPath('org-1', 'prn-1', 2026)).toBe(
      '/producer/org-1/prns/prn-1/choose-year?year=2026'
    )
  })

  test('csoChooseYearPrnPath builds the route with optional year', () => {
    expect(csoChooseYearPrnPath('scheme-1', 'prn-1', 2026)).toBe(
      '/cso/scheme-1/prns/prn-1/choose-year?year=2026'
    )
  })

  test('confirm-accept paths append acceptYear alongside year', () => {
    expect(producerConfirmAcceptPrnPath('org-1', 'prn-1', 2026, 2027)).toBe(
      '/producer/org-1/prns/prn-1/confirm-accept?year=2026&acceptYear=2027'
    )
    expect(csoConfirmAcceptPrnPath('scheme-1', 'prn-1', undefined, 2027)).toBe(
      '/cso/scheme-1/prns/prn-1/confirm-accept?acceptYear=2027'
    )
  })
})
