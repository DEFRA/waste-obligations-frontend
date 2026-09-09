import { describe, test, expect, vi } from 'vitest'
import Boom from '@hapi/boom'

import { obligationsForYear } from './obligations-for-year.js'

describe('obligationsForYear middleware', () => {
  test('calls getOrganisationObligations with the query year', async () => {
    const getOrganisationObligations = vi.fn().mockResolvedValue({
      obligations: [{ material: 'Plastic', status: 'Met' }]
    })
    const request = {
      params: { organisationId: 'org-uuid-1' },
      query: { year: 2025 },
      server: { app: { wasteObligationsApi: { getOrganisationObligations } } }
    }

    const result = await obligationsForYear.method(request)

    expect(result).toEqual([{ material: 'Plastic', status: 'Met' }])
    expect(getOrganisationObligations).toHaveBeenCalledWith('org-uuid-1', 2025)
  })

  test('defaults to current year when query year is absent', async () => {
    const getOrganisationObligations = vi.fn().mockResolvedValue({
      obligations: []
    })
    const request = {
      params: { organisationId: 'org-uuid-1' },
      query: {},
      server: { app: { wasteObligationsApi: { getOrganisationObligations } } }
    }

    await obligationsForYear.method(request)

    expect(getOrganisationObligations).toHaveBeenCalledWith(
      'org-uuid-1',
      new Date().getFullYear()
    )
  })

  test('throws bad implementation when API throws', async () => {
    const err = new Error('upstream unavailable')
    const getOrganisationObligations = vi.fn().mockRejectedValue(err)
    const request = {
      params: { organisationId: 'org-uuid-1' },
      query: { year: 2026 },
      logger: { warn: vi.fn(), error: vi.fn() },
      server: { app: { wasteObligationsApi: { getOrganisationObligations } } }
    }

    try {
      await obligationsForYear.method(request)
      expect.fail('Expected to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(500)
    }
  })
})
