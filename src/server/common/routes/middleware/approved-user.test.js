import Boom from '@hapi/boom'
import { describe, expect, test, vi } from 'vitest'

import {
  EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
  EPR_PACKAGING_DELEGATED_PERSON_SERVICE_ROLE,
  EPR_PACKAGING_BASIC_USER_SERVICE_ROLE
} from '#/server/auth/constants.js'
import { approvedUser } from './approved-user.js'

function mockRequest({ user, path = '/organisations/compliance/x' } = {}) {
  return {
    path,
    yar: { get: vi.fn(() => user) },
    logger: { warn: vi.fn() }
  }
}

describe('approvedUser middleware', () => {
  test('is assigned as `approvedUser`', () => {
    expect(approvedUser.assign).toBe('approvedUser')
  })

  test('reads the user from the `user` session key', () => {
    const request = mockRequest({
      user: {
        id: 'user-1',
        serviceRole: EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE
      }
    })

    approvedUser.method(request)

    expect(request.yar.get).toHaveBeenCalledWith('user')
  })

  test.each([
    ['approved', EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE],
    ['delegated', EPR_PACKAGING_DELEGATED_PERSON_SERVICE_ROLE]
  ])('returns true for %s users', (_label, serviceRole) => {
    const request = mockRequest({ user: { id: 'user-1', serviceRole } })

    expect(approvedUser.method(request)).toBe(true)
    expect(request.logger.warn).not.toHaveBeenCalled()
  })

  test('throws forbidden for basic users', () => {
    const request = mockRequest({
      user: { id: 'user-1', serviceRole: EPR_PACKAGING_BASIC_USER_SERVICE_ROLE }
    })

    try {
      approvedUser.method(request)
      expect.fail('Expected approvedUser to throw')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(403)
    }
  })

  test('throws forbidden when there is no user in the session', () => {
    const request = mockRequest({ user: undefined })

    expect(() => approvedUser.method(request)).toThrow(
      expect.objectContaining({ isBoom: true })
    )
  })

  test('logs a producer-specific warning for producer routes', () => {
    const request = mockRequest({
      user: {
        id: 'user-9',
        serviceRole: EPR_PACKAGING_BASIC_USER_SERVICE_ROLE
      },
      path: '/organisations/producer/abc/prns'
    })

    expect(() => approvedUser.method(request)).toThrow()
    expect(request.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('restricted producer page')
    )
    expect(request.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('userId=user-9, serviceRole=Basic User')
    )
  })

  test('logs a compliance-specific warning for non-producer routes', () => {
    const request = mockRequest({
      user: {
        id: 'user-9',
        serviceRole: EPR_PACKAGING_BASIC_USER_SERVICE_ROLE
      },
      path: '/organisations/compliance/abc'
    })

    expect(() => approvedUser.method(request)).toThrow()
    expect(request.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('restricted compliance page')
    )
  })
})
