import { beforeEach, describe, expect, test, vi } from 'vitest'

import Boom from '@hapi/boom'

const configGetMock = vi.hoisted(() => vi.fn())

vi.mock('#/config/config.js', () => ({
  config: {
    get: (...args) => configGetMock(...args)
  }
}))

import {
  HEALTH_ALL_TOKEN_HEADER,
  healthAllAccess,
  isHealthAllTokenValid
} from './access.js'

describe('isHealthAllTokenValid', () => {
  test('accepts an exact non-empty token match', () => {
    expect(isHealthAllTokenValid('health-token', 'health-token')).toBe(true)
  })

  test('rejects an absent or mismatched token', () => {
    expect(isHealthAllTokenValid(undefined, 'health-token')).toBe(false)
    expect(isHealthAllTokenValid('different-token', 'health-token')).toBe(false)
    expect(isHealthAllTokenValid('', '')).toBe(false)
  })
})

describe('healthAllAccess', () => {
  beforeEach(() => {
    configGetMock.mockReset()
    configGetMock.mockImplementation((key) => {
      if (key === 'health.all.token') {
        return 'config-health-token'
      }

      return undefined
    })
  })

  test('continues when the request token matches the server app token', () => {
    const h = { continue: Symbol('continue') }
    const request = {
      server: { app: { healthAllToken: 'health-token' } },
      headers: { [HEALTH_ALL_TOKEN_HEADER]: 'health-token' }
    }

    expect(healthAllAccess(request, h)).toBe(h.continue)
    expect(configGetMock).not.toHaveBeenCalled()
  })

  test('falls back to config token when the server app token is unset', () => {
    const h = { continue: Symbol('continue') }
    const request = {
      server: { app: {} },
      headers: { [HEALTH_ALL_TOKEN_HEADER]: 'config-health-token' }
    }

    expect(healthAllAccess(request, h)).toBe(h.continue)
    expect(configGetMock).toHaveBeenCalledWith('health.all.token')
  })

  test('rejects requests with an invalid token', () => {
    const request = {
      server: { app: { healthAllToken: 'health-token' } },
      headers: { [HEALTH_ALL_TOKEN_HEADER]: 'wrong-token' }
    }

    try {
      healthAllAccess(request, { continue: vi.fn() })
      expect.unreachable('Expected unauthorized error')
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true)
      expect(error.output.statusCode).toBe(401)
    }
  })
})
