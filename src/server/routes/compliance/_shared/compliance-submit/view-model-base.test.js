import { describe, expect, test } from 'vitest'

import {
  buildOrganisationAddress,
  buildSubmitObligationTables,
  buildSubmitPageTitle
} from './view-model-base.js'

describe('buildSubmitObligationTables', () => {
  test('builds obligation and glass table rows', () => {
    const obligations = [
      {
        material: 'Plastic',
        recyclingTarget: 0.75,
        tonnages: {
          material: 100,
          awaitingAcceptance: 0,
          accepted: 100,
          outstanding: 0,
          obligated: 75
        },
        status: 'Met'
      },
      {
        material: 'Glass',
        recyclingTarget: 0.8,
        tonnages: {
          material: 50,
          awaitingAcceptance: 0,
          accepted: 40,
          outstanding: 10,
          obligated: 40
        },
        status: 'NotMet'
      }
    ]

    const tables = buildSubmitObligationTables(obligations, 'en')

    expect(tables.obligationsTableRows.length).toBeGreaterThan(0)
    expect(tables.glassTableRows.length).toBeGreaterThan(0)
  })
})

describe('buildSubmitPageTitle', () => {
  test('returns translated page title without errors', () => {
    expect(
      buildSubmitPageTitle('en', 'compliance.certificateSubmit.pageTitle', null)
    ).toBe('Check and submit your certificate of compliance')
  })

  test('prefixes page title when form errors are present', () => {
    expect(
      buildSubmitPageTitle('en', 'compliance.certificateSubmit.pageTitle', {
        summary: [],
        fields: {}
      })
    ).toBe('Error: Check and submit your certificate of compliance')
  })
})

describe('buildOrganisationAddress', () => {
  test('formats organisation address from cached organisation', () => {
    expect(
      buildOrganisationAddress({
        address: {
          addressLine1: '1 The Street',
          town: 'Cardiff',
          postcode: 'CF10 1AA'
        }
      })
    ).toBe('1 The Street, Cardiff, CF10 1AA')
  })

  test('returns empty string when organisation is missing', () => {
    expect(buildOrganisationAddress(null)).toBe('')
  })
})
