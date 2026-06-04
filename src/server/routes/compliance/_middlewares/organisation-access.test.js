import Boom from '@hapi/boom'
import { describe, expect, test, vi } from 'vitest'

import {
  organisationAccess,
  userCanAccessOrganisation
} from './organisation-access.js'

describe('userCanAccessOrganisation', () => {
  const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

  test('returns true when user is enrolled in the organisation', () => {
    expect(
      userCanAccessOrganisation(
        {
          organisations: [
            {
              id: 'B6F76437-65B6-4ED2-A7D5-C50E9AF76201',
              name: 'Example Org',
              organisationNumber: '100003'
            }
          ]
        },
        organisationId
      )
    ).toBe(true)
  })

  test('returns false when organisation is not in the user list', () => {
    expect(
      userCanAccessOrganisation(
        {
          organisations: [
            {
              id: '923fa611-571c-4948-ab7d-fbb75e75ed65',
              name: 'Other Org',
              organisationNumber: '100004'
            }
          ]
        },
        organisationId
      )
    ).toBe(false)
  })

  test('returns false when user has no organisations', () => {
    expect(
      userCanAccessOrganisation({ organisations: [] }, organisationId)
    ).toBe(false)
    expect(userCanAccessOrganisation(null, organisationId)).toBe(false)
  })

  test('returns false when organisation entries have no id', () => {
    expect(
      userCanAccessOrganisation(
        { organisations: [{ organisationNumber: '154977' }] },
        organisationId
      )
    ).toBe(false)
  })
})

describe('organisationAccess middleware', () => {
  test('allows request when user has access', () => {
    const result = organisationAccess.method({
      params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
      yar: {
        get: () => ({
          id: 'user-1',
          organisations: [
            {
              id: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
              name: 'Example Org',
              organisationNumber: '100003'
            }
          ]
        })
      },
      logger: { warn: vi.fn() }
    })

    expect(result).toBe(true)
  })

  test('throws forbidden when user does not have access', () => {
    try {
      organisationAccess.method({
        params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
        yar: {
          get: () => ({
            id: 'user-1',
            organisations: [
              {
                id: '923fa611-571c-4948-ab7d-fbb75e75ed65',
                name: 'Other Org',
                organisationNumber: '100004'
              }
            ]
          })
        },
        logger: { warn: vi.fn() }
      })
      expect.fail('Expected organisationAccess to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(403)
    }
  })

  test('throws forbidden when user is missing from session', () => {
    try {
      organisationAccess.method({
        params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
        yar: { get: () => undefined },
        logger: { warn: vi.fn() }
      })
      expect.fail('Expected organisationAccess to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(403)
    }
  })
})
