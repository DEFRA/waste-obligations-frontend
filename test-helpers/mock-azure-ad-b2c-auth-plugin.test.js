import { describe, expect, test, vi } from 'vitest'

import { AZURE_AD_B2C_AUTH_STRATEGY } from '#/server/auth/azure-ad-b2c.js'
import {
  MOCK_AUTH_USER_EMAIL,
  MOCK_AUTH_USER_ID
} from '#/test-helpers/auth-test-constants.js'
import { mockAzureAdB2cAuth } from '#/test-helpers/mock-azure-ad-b2c-auth-plugin.js'

function createServerStub() {
  const strategies = []
  return {
    auth: {
      scheme: vi.fn((name, factory) => {
        strategies.push({ type: 'scheme', name, factory })
      }),
      strategy: vi.fn((name, scheme) => {
        strategies.push({ type: 'strategy', name, scheme })
      })
    },
    strategies
  }
}

describe('mock-azure-ad-b2c-auth plugin', () => {
  test('registers mock strategy with unit-test profile', async () => {
    const server = createServerStub()
    await mockAzureAdB2cAuth.plugin.register(server)

    expect(server.auth.scheme).toHaveBeenCalledWith(
      'mock-azure-ad-b2c',
      expect.any(Function)
    )
    expect(server.auth.strategy).toHaveBeenCalledWith(
      AZURE_AD_B2C_AUTH_STRATEGY,
      'mock-azure-ad-b2c'
    )

    const scheme = server.strategies.find((entry) => entry.type === 'scheme')
    const authenticate = scheme.factory().authenticate
    const h = {
      authenticated: vi.fn((credentials) => credentials)
    }

    authenticate({}, h)

    expect(h.authenticated).toHaveBeenCalledWith({
      credentials: expect.objectContaining({
        token: 'mock-access-token',
        profile: expect.objectContaining({
          sub: MOCK_AUTH_USER_ID,
          email: MOCK_AUTH_USER_EMAIL
        })
      })
    })
  })
})
