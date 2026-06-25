import { describe, expect, test } from 'vitest'

import {
  formatOrganisationAddress,
  formatOrganisationName,
  formatSchemeOperatorName
} from './organisation-formatters.js'

describe('formatOrganisationAddress', () => {
  test('returns empty string for null address', () => {
    expect(formatOrganisationAddress(null)).toBe('')
  })

  test('trims a string address', () => {
    expect(formatOrganisationAddress('  10 High Street  ')).toBe(
      '10 High Street'
    )
  })

  test('joins structured address fields', () => {
    expect(
      formatOrganisationAddress({
        addressLine1: '1 The Street',
        town: 'Cardiff',
        postcode: 'CF10 1AA'
      })
    ).toBe('1 The Street, Cardiff, CF10 1AA')
  })
})

describe('formatOrganisationName', () => {
  test('returns organisation name for large producer', () => {
    expect(
      formatOrganisationName(
        {
          name: 'Direct Producer Ltd',
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        2026
      )
    ).toBe('Direct Producer Ltd')
  })

  test('returns trading name for compliance scheme', () => {
    expect(
      formatOrganisationName(
        {
          name: 'Scheme Parent Ltd',
          tradingName: 'Scheme Trading Name',
          registrations: [
            {
              type: 'COMPLIANCE_SCHEME',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        2026
      )
    ).toBe('Scheme Trading Name')
  })

  test('throws when no registration exists for the year', () => {
    expect(() =>
      formatOrganisationName(
        {
          name: 'Example Org',
          registrations: []
        },
        2026
      )
    ).toThrow('No registration found, using year 2026')
  })

  test('returns empty string when organisation is null', () => {
    expect(formatOrganisationName(null, 2026)).toBe('')
  })
})

describe('formatSchemeOperatorName', () => {
  test('returns organisation name when present', () => {
    expect(formatSchemeOperatorName({ name: 'Operator Ltd' })).toBe(
      'Operator Ltd'
    )
  })

  test('returns empty string when organisation is missing', () => {
    expect(formatSchemeOperatorName(null)).toBe('')
    expect(formatSchemeOperatorName({})).toBe('')
  })
})
