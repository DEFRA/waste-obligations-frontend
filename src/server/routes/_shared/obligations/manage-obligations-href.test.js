import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { config } from '#/config/config.js'

import { manageObligationsHref } from './manage-obligations-href.js'

const AZURE_MANAGE_OBLIGATIONS_URL = config.get(
  'eprPackaging.manageYourRecyclingObligationsUrl'
)

function requestWithPrefix(prefix) {
  return { headers: prefix ? { 'x-forwarded-prefix': prefix } : {} }
}

describe('manageObligationsHref', () => {
  let previousManageObligations

  beforeEach(() => {
    previousManageObligations = config.get('features.manageObligations')
  })

  afterEach(() => {
    config.set('features.manageObligations', previousManageObligations)
  })

  describe('with the Manage Obligations page on', () => {
    beforeEach(() => {
      config.set('features.manageObligations', true)
    })

    test('links a producer to their Manage Obligations page for the year', () => {
      expect(
        manageObligationsHref(requestWithPrefix(), {
          userType: 'producer',
          id: 'org-1',
          year: 2026
        })
      ).toBe('/producer/org-1/obligations?year=2026')
    })

    test('links a compliance scheme to its Manage Obligations page for the year', () => {
      expect(
        manageObligationsHref(requestWithPrefix(), {
          userType: 'cso',
          id: 'scheme-1',
          year: '2025'
        })
      ).toBe('/cso/scheme-1/obligations?year=2025')
    })

    test('leaves the year out when there is none', () => {
      expect(
        manageObligationsHref(requestWithPrefix(), {
          userType: 'producer',
          id: 'org-1'
        })
      ).toBe('/producer/org-1/obligations')
    })

    test('keeps the Welsh language', () => {
      expect(
        manageObligationsHref(
          { headers: {}, query: { lang: 'cy' } },
          { userType: 'cso', id: 'scheme-1', year: 2026 }
        )
      ).toBe('/cso/scheme-1/obligations?year=2026&lang=cy')
    })

    test('keeps the forwarded prefix', () => {
      expect(
        manageObligationsHref(
          requestWithPrefix('/manage-recycling-obligations'),
          { userType: 'cso', id: 'scheme-1', year: 2026 }
        )
      ).toBe('/manage-recycling-obligations/cso/scheme-1/obligations?year=2026')
    })
  })

  test('with the Manage Obligations page off, keeps the packaging page', () => {
    config.set('features.manageObligations', false)

    expect(
      manageObligationsHref(
        requestWithPrefix('/manage-recycling-obligations'),
        {
          userType: 'producer',
          id: 'org-1',
          year: 2026
        }
      )
    ).toBe(AZURE_MANAGE_OBLIGATIONS_URL)
  })
})
