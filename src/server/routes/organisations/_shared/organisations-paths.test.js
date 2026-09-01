import { describe, expect, test } from 'vitest'

import {
  producerPrnsPath,
  producerPrnPath,
  producerConfirmAcceptPrnPath,
  csoPrnsPath,
  csoPrnPath,
  csoConfirmAcceptPrnPath
} from './organisations-paths.js'

describe('organisations paths', () => {
  describe('producer paths', () => {
    test('producerPrnsPath builds the producer PRNs list route', () => {
      expect(producerPrnsPath('org-1')).toBe(
        '/organisations/producer/org-1/prns'
      )
    })

    test('producerPrnPath builds the single PRN route', () => {
      expect(producerPrnPath('org-1', 'prn-1')).toBe(
        '/organisations/producer/org-1/prns/prn-1'
      )
    })

    test('producerPrnPath appends the year query when provided', () => {
      expect(producerPrnPath('org-1', 'prn-1', 2024)).toBe(
        '/organisations/producer/org-1/prns/prn-1?year=2024'
      )
    })

    test('producerConfirmAcceptPrnPath builds the confirm-accept route', () => {
      expect(producerConfirmAcceptPrnPath('org-1', 'prn-1')).toBe(
        '/organisations/producer/org-1/prns/prn-1/confirm-accept'
      )
    })

    test('producerConfirmAcceptPrnPath appends the year query when provided', () => {
      expect(producerConfirmAcceptPrnPath('org-1', 'prn-1', 2024)).toBe(
        '/organisations/producer/org-1/prns/prn-1/confirm-accept?year=2024'
      )
    })
  })

  describe('CSO paths', () => {
    test('csoPrnsPath builds the CSO PRNs list route', () => {
      expect(csoPrnsPath('scheme-1')).toBe('/organisations/cso/scheme-1/prns')
    })

    test('csoPrnPath builds the single PRN route', () => {
      expect(csoPrnPath('scheme-1', 'prn-1')).toBe(
        '/organisations/cso/scheme-1/prns/prn-1'
      )
    })

    test('csoPrnPath appends the year query when provided', () => {
      expect(csoPrnPath('scheme-1', 'prn-1', 2024)).toBe(
        '/organisations/cso/scheme-1/prns/prn-1?year=2024'
      )
    })

    test('csoConfirmAcceptPrnPath builds the confirm-accept route', () => {
      expect(csoConfirmAcceptPrnPath('scheme-1', 'prn-1')).toBe(
        '/organisations/cso/scheme-1/prns/prn-1/confirm-accept'
      )
    })

    test('csoConfirmAcceptPrnPath appends the year query when provided', () => {
      expect(csoConfirmAcceptPrnPath('scheme-1', 'prn-1', 2024)).toBe(
        '/organisations/cso/scheme-1/prns/prn-1/confirm-accept?year=2024'
      )
    })
  })

  describe('year query handling', () => {
    test.each([
      ['undefined', undefined],
      ['null', null],
      ['an empty string', '']
    ])('omits the year query when the year is %s', (_label, year) => {
      expect(producerPrnPath('org-1', 'prn-1', year)).toBe(
        '/organisations/producer/org-1/prns/prn-1'
      )
      expect(csoPrnPath('scheme-1', 'prn-1', year)).toBe(
        '/organisations/cso/scheme-1/prns/prn-1'
      )
    })

    test('keeps a year of 0', () => {
      expect(producerPrnPath('org-1', 'prn-1', 0)).toBe(
        '/organisations/producer/org-1/prns/prn-1?year=0'
      )
    })
  })
})
