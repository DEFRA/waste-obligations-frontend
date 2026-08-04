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

  function buildRequest({ sessionUser, accountUser }) {
    const yarStore = new Map([['user', sessionUser]])

    return {
      params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
      yar: {
        get: (key) => yarStore.get(key),
        set: (key, value) => yarStore.set(key, value)
      },
      logger: { warn: vi.fn() },
      server: {
        app: {
          backendAccountApi: {
            getUserOrganisations: vi.fn().mockResolvedValue({
              user: accountUser
            })
          }
        }
      }
    }
  }

  test('returns matching organisation from the refreshed account user', async () => {
    const request = buildRequest({
      sessionUser: { id: 'user-1', organisations: [] },
      accountUser: { organisations: [enrolledOrganisation] }
    })

    const result = await currentOrganisation.method(request)

    expect(result).toEqual(enrolledOrganisation)
    expect(
      request.server.app.backendAccountApi.getUserOrganisations
    ).toHaveBeenCalledWith('user-1')
  })

  test('throws forbidden when the refreshed user does not have access', async () => {
    const request = buildRequest({
      sessionUser: { id: 'user-1', organisations: [enrolledOrganisation] },
      accountUser: {
        organisations: [
          {
            id: '923fa611-571c-4948-ab7d-fbb75e75ed65',
            name: 'Other Org',
            organisationNumber: '100004'
          }
        ]
      }
    })

    await expect(currentOrganisation.method(request)).rejects.toEqual(
      Boom.forbidden()
    )
  })

  test('does not use the session user when account service lookup fails', async () => {
    const request = buildRequest({
      sessionUser: { id: 'user-1', organisations: [enrolledOrganisation] },
      accountUser: { organisations: [enrolledOrganisation] }
    })
    const upstreamError = new Error('account service unavailable')

    request.server.app.backendAccountApi.getUserOrganisations.mockRejectedValue(
      upstreamError
    )

    await expect(currentOrganisation.method(request)).rejects.toThrow(
      upstreamError
    )
  })

  test('throws forbidden when user is missing from session', async () => {
    await expect(
      currentOrganisation.method({
        params: { organisationId: 'b6f76437-65b6-4ed2-a7d5-c50e9af76201' },
        yar: { get: () => undefined },
        logger: { warn: vi.fn() }
      })
    ).rejects.toEqual(Boom.forbidden())
  })
})
