import Boom from '@hapi/boom'
import { describe, expect, test, vi } from 'vitest'

import {
  currentOrganisation,
  findUserOrganisation,
  userCanAccessOrganisation
} from './current-organisation.js'

describe('findUserOrganisation', () => {
  const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
  const enrolledOrganisation = {
    id: 'B6F76437-65B6-4ED2-A7D5-C50E9AF76201',
    name: 'Example Org',
    organisationNumber: '100003'
  }

  test('returns matching organisation when user is enrolled', () => {
    expect(
      findUserOrganisation(
        { organisations: [enrolledOrganisation] },
        organisationId
      )
    ).toEqual(enrolledOrganisation)
  })

  test('returns null when organisation is not in the user list', () => {
    expect(
      findUserOrganisation(
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
    ).toBeNull()
  })

  test('returns null when user has no organisations', () => {
    expect(
      findUserOrganisation({ organisations: [] }, organisationId)
    ).toBeNull()
    expect(findUserOrganisation(null, organisationId)).toBeNull()
  })

  test('returns null when organisation entries have no id', () => {
    expect(
      findUserOrganisation(
        { organisations: [{ organisationNumber: '154977' }] },
        organisationId
      )
    ).toBeNull()
  })
})

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
})

describe('currentOrganisation middleware', () => {
  const enrolledOrganisation = {
    id: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201',
    name: 'Example Org',
    organisationNumber: '100003'
  }

  test('returns matching organisation when user has access', () => {
    const result = currentOrganisation.method({
      params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
      yar: {
        get: () => ({
          id: 'user-1',
          organisations: [enrolledOrganisation]
        })
      },
      logger: { warn: vi.fn() }
    })

    expect(result).toEqual(enrolledOrganisation)
  })

  test('throws forbidden when user does not have access', () => {
    try {
      currentOrganisation.method({
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
      expect.fail('Expected currentOrganisation to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(403)
    }
  })

  test('throws forbidden when user is missing from session', () => {
    try {
      currentOrganisation.method({
        params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
        yar: { get: () => undefined },
        logger: { warn: vi.fn() }
      })
      expect.fail('Expected currentOrganisation to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(403)
    }
  })
})
