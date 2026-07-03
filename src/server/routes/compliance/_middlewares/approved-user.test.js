import Boom from '@hapi/boom'
import { describe, expect, test, vi } from 'vitest'

import {
  EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
  EPR_PACKAGING_BASIC_USER_SERVICE_ROLE
} from '#/server/auth/constants.js'
import { approvedUser } from './approved-user.js'

describe('approvedUser middleware', () => {
  test('returns true for approved or delegated users', () => {
    const result = approvedUser.method({
      yar: {
        get: () => ({
          id: 'user-1',
          serviceRole: EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE
        })
      },
      logger: { warn: vi.fn() }
    })

    expect(result).toBe(true)
  })

  test('throws not found for basic users', () => {
    try {
      approvedUser.method({
        yar: {
          get: () => ({
            id: 'user-1',
            serviceRole: EPR_PACKAGING_BASIC_USER_SERVICE_ROLE
          })
        },
        logger: { warn: vi.fn() }
      })
      expect.fail('Expected approvedUser to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(404)
    }
  })
})
