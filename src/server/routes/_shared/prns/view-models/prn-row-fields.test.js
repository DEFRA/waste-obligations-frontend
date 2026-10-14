import { describe, expect, test } from 'vitest'

import {
  formatPrnIssuedAt,
  prnDetailPath,
  prnIssuerName,
  prnTonnage
} from './prn-row-fields.js'

const pathId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const prnId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'

describe('prnDetailPath', () => {
  test('links to the producer PRN page for a producer', () => {
    expect(prnDetailPath('producer', pathId, prnId, 2026)).toBe(
      `/producer/${pathId}/prns/${prnId}?year=2026`
    )
  })

  test('links to the CSO PRN page for a CSO', () => {
    expect(prnDetailPath('cso', pathId, prnId, 2026)).toBe(
      `/cso/${pathId}/prns/${prnId}?year=2026`
    )
  })

  test('omits the year when none is given', () => {
    expect(prnDetailPath('producer', pathId, prnId)).toBe(
      `/producer/${pathId}/prns/${prnId}`
    )
  })
})

describe('formatPrnIssuedAt', () => {
  test('formats an issued date', () => {
    expect(formatPrnIssuedAt({ issuedAt: '2026-04-02' })).toBe('02 Apr 2026')
  })

  test('returns an empty string when there is no issued date', () => {
    expect(formatPrnIssuedAt({})).toBe('')
  })
})

describe('prnIssuerName', () => {
  test("returns the issuer's organisation name", () => {
    expect(
      prnIssuerName({ issuer: { organisationName: 'Reprocessor Ltd' } })
    ).toBe('Reprocessor Ltd')
  })

  test('returns an empty string when there is no issuer', () => {
    expect(prnIssuerName({})).toBe('')
  })
})

describe('prnTonnage', () => {
  test('returns the tonnage', () => {
    expect(prnTonnage({ tonnage: 75 })).toBe(75)
  })

  test('defaults to 0 when there is no tonnage', () => {
    expect(prnTonnage({})).toBe(0)
  })
})
