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

import {
  AZURE_AD_B2C_AUTH_STRATEGY,
  BELL_AZURE_AD_B2C_COOKIE
} from '#/server/auth/azure-ad-b2c.js'

import { azureAdB2cAuth } from './azure-ad-b2c-auth.js'

function createServerStub() {
  const strategies = []
  return {
    register: vi.fn().mockResolvedValue(undefined),
    logger: { warn: vi.fn(), info: vi.fn() },
    ext: vi.fn(),
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

  test('registers Bell strategy with B2C endpoints', async () => {
    configGetMock.mockImplementation((key) => {
      if (key === 'auth.azureAdB2c') {
        return {
          instance: 'https://tenant.b2clogin.com',
          domain: 'tenant.onmicrosoft.com',
          userFlow: 'B2C_1A_EPR_SignUpSignIn',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          cookiePassword: 'secret-password-must-be-at-least-32-characters-long',
          isSecure: true,
          tenantId: 'tenant-guid'
        }
      }
      if (key === 'httpProxy') return null
      return undefined
    })

    const server = createServerStub()
    await azureAdB2cAuth.plugin.register(server)

    expect(server.auth.strategy).toHaveBeenCalledWith(
      AZURE_AD_B2C_AUTH_STRATEGY,
      'bell',
      expect.objectContaining({
        clientId: 'client-id',
        cookie: BELL_AZURE_AD_B2C_COOKIE,
        isSameSite: 'Lax',
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
    expect(
      bellStrategy.options.location({
        headers: {
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'host-address',
          'x-forwarded-prefix': '/manage-recycling-obligations'
        },
        path: '/signin-oidc',
        server: { info: { protocol: 'http' } },
        info: { host: 'internal:3000' }
      })
    ).toBe('https://host-address/manage-recycling-obligations/signin-oidc')
  })

  test('profile callback returns empty profile when id_token is missing', async () => {
    configGetMock.mockImplementation((key) => {
      if (key === 'auth.azureAdB2c') {
        return {
          instance: 'https://tenant.b2clogin.com',
          domain: 'tenant.onmicrosoft.com',
          userFlow: 'B2C_1A_EPR_SignUpSignIn',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          cookiePassword: 'secret-password-must-be-at-least-32-characters-long',
          isSecure: true
        }
      }
      if (key === 'httpProxy') return null
      return undefined
    })

    const server = createServerStub()
    await azureAdB2cAuth.plugin.register(server)

    const bellStrategy = server.strategies.find(
      (entry) => entry.type === 'strategy' && entry.scheme === 'bell'
    )
    const credentials = {}

    bellStrategy.options.provider.profile(credentials, {})

    expect(credentials.profile).toEqual({})
  })

  test('warns when B2C client credentials are not configured', async () => {
    configGetMock.mockImplementation((key) => {
      if (key === 'auth.azureAdB2c') {
        return {
          instance: 'https://tenant.b2clogin.com',
          domain: 'tenant.onmicrosoft.com',
          userFlow: 'B2C_1A_EPR_SignUpSignIn',
          clientId: '',
          clientSecret: '',
          cookiePassword: 'secret-password-must-be-at-least-32-characters-long',
          isSecure: true
        }
      }
      return undefined
    })

    const server = createServerStub()
    await azureAdB2cAuth.plugin.register(server)

    expect(server.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Azure AD B2C is not configured')
    )
  })

  test('uses configured scopes and removes invalid GUID-like scopes', async () => {
    const clientId = 'a1111111-2222-3333-4444-555555555555'
    const logger = { warn: vi.fn() }

    configGetMock.mockImplementation((key) => {
      if (key === 'auth.azureAdB2c') {
        return {
          instance: 'https://tenant.b2clogin.com',
          domain: 'tenant.onmicrosoft.com',
          userFlow: 'B2C_1A_EPR_SignUpSignIn',
          clientId,
          clientSecret: 'client-secret',
          cookiePassword: 'secret-password-must-be-at-least-32-characters-long',
          isSecure: true,
          scopes: `openid ${clientId} custom-scope`
        }
      }
      return undefined
    })

    const server = createServerStub()
    server.logger = logger
    await azureAdB2cAuth.plugin.register(server)

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Ignoring invalid Azure AD B2C scopes (client ID / GUIDs are not valid scopes): removedScopes=${clientId}`
      )
    )

    const bellStrategy = server.strategies.find(
      (entry) => entry.type === 'strategy' && entry.scheme === 'bell'
    )
    expect(bellStrategy.options.provider.scope).toEqual([
      'openid',
      'custom-scope'
    ])
  })

  test('falls back to default scopes when configured scopes are empty', async () => {
    configGetMock.mockImplementation((key) => {
      if (key === 'auth.azureAdB2c') {
        return {
          instance: 'https://tenant.b2clogin.com',
          domain: 'tenant.onmicrosoft.com',
          userFlow: 'B2C_1A_EPR_SignUpSignIn',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          cookiePassword: 'secret-password-must-be-at-least-32-characters-long',
          isSecure: true,
          scopes: '   '
        }
      }
      return undefined
    })

    const server = createServerStub()
    await azureAdB2cAuth.plugin.register(server)

    const bellStrategy = server.strategies.find(
      (entry) => entry.type === 'strategy' && entry.scheme === 'bell'
    )
    expect(bellStrategy.options.provider.scope).toEqual([
      'openid',
      'profile',
      'offline_access'
    ])
  })
})
