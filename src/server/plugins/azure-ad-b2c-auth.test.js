import { vi } from 'vitest'

const bellRegisterMock = vi.hoisted(() => vi.fn())
const configGetMock = vi.hoisted(() => vi.fn())

vi.mock('@hapi/bell', () => ({
  default: bellRegisterMock
}))

vi.mock('#/config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

import { AZURE_AD_B2C_AUTH_STRATEGY } from '#/server/auth/azure-ad-b2c.js'

import { azureAdB2cAuth } from './azure-ad-b2c-auth.js'

function createServerStub() {
  const strategies = []
  return {
    register: vi.fn().mockResolvedValue(undefined),
    auth: {
      scheme: vi.fn((name, factory) => {
        strategies.push({ type: 'scheme', name, factory })
      }),
      strategy: vi.fn((name, scheme, options) => {
        strategies.push({ type: 'strategy', name, scheme, options })
      })
    },
    settings: { tls: true },
    strategies
  }
}

describe('azure-ad-b2c-auth plugin', () => {
  beforeEach(() => {
    bellRegisterMock.mockReset()
    configGetMock.mockReset()
  })

  test('registers mock strategy in test environment', async () => {
    configGetMock.mockImplementation((key) => {
      if (key === 'isTest') return true
      return undefined
    })

    const server = createServerStub()
    await azureAdB2cAuth.plugin.register(server)

    expect(server.register).toHaveBeenCalledWith(bellRegisterMock)
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
          sub: expect.any(String),
          email: 'test.user@example.com'
        })
      })
    })
  })

  test('registers Bell strategy with B2C endpoints outside test', async () => {
    configGetMock.mockImplementation((key) => {
      if (key === 'isTest') return false
      if (key === 'auth.azureAdB2c') {
        return {
          instance: 'https://tenant.b2clogin.com',
          domain: 'tenant.onmicrosoft.com',
          userFlow: 'B2C_1A_EPR_SignUpSignIn',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          cookiePassword: 'secret-password-must-be-at-least-32-characters-long',
          isSecure: true,
          redirectUri: 'https://localhost:8010/auth/callback',
          tenantId: 'tenant-guid'
        }
      }
      if (key === 'host') return '0.0.0.0'
      if (key === 'port') return 8010
      return undefined
    })

    const server = createServerStub()
    await azureAdB2cAuth.plugin.register(server)

    expect(server.auth.strategy).toHaveBeenCalledWith(
      AZURE_AD_B2C_AUTH_STRATEGY,
      'bell',
      expect.objectContaining({
        clientId: 'client-id',
        provider: expect.objectContaining({
          auth: expect.stringContaining('/oauth2/v2.0/authorize'),
          token: expect.stringContaining('/oauth2/v2.0/token')
        })
      })
    )

    const bellStrategy = server.strategies.find(
      (entry) => entry.type === 'strategy' && entry.scheme === 'bell'
    )
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'decoded-user',
        email: 'decoded@example.com'
      })
    ).toString('base64url')
    const idToken = `header.${payload}.signature`
    const credentials = {}
    const params = { id_token: idToken }

    bellStrategy.options.provider.profile(credentials, params)

    expect(credentials.profile).toEqual({
      sub: 'decoded-user',
      email: 'decoded@example.com'
    })
  })
})
