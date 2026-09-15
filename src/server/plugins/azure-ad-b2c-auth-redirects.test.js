import Hapi from '@hapi/hapi'

import { config } from '#/config/config.js'
import { AZURE_AD_B2C_AUTH_STRATEGY } from '#/server/auth/azure-ad-b2c.js'
import { azureAdB2cAuth } from './azure-ad-b2c-auth.js'

const callbackQuery = 'state=test-state&code=test-code'
const scenarios = [
  [
    'CDP direct',
    {
      host: 'waste-obligations-frontend.perf-test.cdp-int.defra.cloud',
      'x-forwarded-proto': 'https'
    },
    'https://waste-obligations-frontend.perf-test.cdp-int.defra.cloud/signin-oidc'
  ],
  [
    'CDP proxy',
    {
      host: 'internal:3000',
      'x-forwarded-host': 'packaging-waste-proxy.perf-test.cdp-int.defra.cloud',
      'x-forwarded-proto': 'https',
      'x-forwarded-prefix': '/manage-recycling-obligations'
    },
    'https://packaging-waste-proxy.perf-test.cdp-int.defra.cloud/manage-recycling-obligations/signin-oidc'
  ],
  [
    'vanity URL',
    {
      host: 'internal:3000',
      'x-forwarded-host': 'service.defra.gov.uk',
      'x-forwarded-proto': 'https',
      'x-forwarded-prefix': '/manage-recycling-obligations'
    },
    'https://service.defra.gov.uk/manage-recycling-obligations/signin-oidc'
  ],
  [
    'proxy without forwarded host',
    {
      host: 'service.defra.gov.uk',
      'x-forwarded-proto': 'https',
      'x-forwarded-prefix': '/manage-recycling-obligations'
    },
    'https://service.defra.gov.uk/manage-recycling-obligations/signin-oidc'
  ]
]

describe('Azure AD B2C redirects with real Bell authentication', () => {
  let server
  let provider
  let previousConfig
  let tokenRedirectUri

  beforeAll(async () => {
    previousConfig = config.get('auth.azureAdB2c')
    provider = Hapi.server({ host: '127.0.0.1', port: 0 })
    provider.route({
      method: 'POST',
      path: '/tenant/flow/oauth2/v2.0/token',
      handler(request) {
        tokenRedirectUri = request.payload.redirect_uri
        const payload = Buffer.from(
          JSON.stringify({ sub: 'test-user' })
        ).toString('base64url')
        return {
          access_token: 'test-access-token',
          token_type: 'Bearer',
          id_token: `header.${payload}.signature`
        }
      }
    })
    await provider.start()
    config.set('auth.azureAdB2c', {
      ...previousConfig,
      instance: provider.info.uri,
      domain: 'tenant',
      userFlow: 'flow',
      clientId: 'test-client',
      clientSecret: 'test-secret',
      isSecure: false
    })
    server = Hapi.server()
    server.decorate('server', 'logger', { warn() {} })
    await server.register(azureAdB2cAuth)
    server.route({
      method: 'GET',
      path: '/signin-oidc',
      options: { auth: AZURE_AD_B2C_AUTH_STRATEGY },
      handler: (request) => request.auth.credentials.profile
    })
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop()
    await provider?.stop()
    config.set('auth.azureAdB2c', previousConfig)
  })

  test.each(scenarios)(
    'missing-cookie meta-refresh stays on the public host: %s',
    async (_name, headers, callbackUrl) => {
      const response = await server.inject({
        url: `/signin-oidc?${callbackQuery}`,
        headers
      })

      expect(response.statusCode).toBe(200)
      expect(response.payload).toBe(
        `<html><head><meta http-equiv="refresh" content="0;URL='${callbackUrl}?${callbackQuery}&refresh=1'"></head><body></body></html>`
      )
      expect(response.payload).not.toContain('untrusted.example.com')
    }
  )

  test.each(scenarios)(
    'sign-in completes with the public callback URL: %s',
    async (_name, headers, callbackUrl) => {
      const signIn = await server.inject({ url: '/signin-oidc', headers })
      expect(signIn.statusCode).toBe(302)
      const authorization = new URL(signIn.headers.location)
      expect(authorization.searchParams.get('redirect_uri')).toBe(callbackUrl)
      const state = authorization.searchParams.get('state')
      const cookie = signIn.headers['set-cookie']
        .map((value) => value.split(';')[0])
        .join('; ')
      const callback = await server.inject({
        url: `/signin-oidc?code=test-code&state=${state}`,
        headers: { ...headers, cookie }
      })

      expect(callback.statusCode).toBe(200)
      expect(callback.result).toEqual({ sub: 'test-user' })
      expect(tokenRedirectUri).toBe(callbackUrl)
    }
  )

  test.each([
    { host: 'untrusted.example.com' },
    {
      host: 'service.defra.gov.uk',
      'x-forwarded-host': 'untrusted.example.com'
    },
    {
      host: 'service.defra.gov.uk',
      'x-forwarded-host': 'service.defra.gov.uk, untrusted.example.com'
    },
    { host: 'service.defra.gov.uk', 'x-forwarded-host': '' },
    {
      host: 'service.defra.gov.uk',
      'x-forwarded-host': 'service.defra.gov.uk@untrusted.example.com'
    },
    {
      host: 'service.defra.gov.uk',
      'x-forwarded-host': 'https://service.defra.gov.uk'
    },
    { host: 'localhost:8010' }
  ])(
    'rejects disallowed hosts before sign-in or callback recovery: %j',
    async (headers) => {
      for (const query of ['', `?${callbackQuery}`]) {
        const response = await server.inject({
          url: `/signin-oidc${query}`,
          headers
        })
        expect(response.statusCode).toBe(400)
        expect(response.headers.location).toBeUndefined()
        expect(response.payload).not.toContain('test-code')
        expect(response.payload).not.toContain('test-state')
        expect(response.payload).not.toContain('refresh')
        expect(response.payload).not.toContain('untrusted.example.com')
      }
    }
  )

  test('local override replaces Defra defaults and supports both local entry points', async () => {
    const previous = config.get('auth.azureAdB2c.allowedHosts')
    try {
      config.set('auth.azureAdB2c.allowedHosts', ['localhost'])
      for (const headers of [
        { host: 'localhost:8010', 'x-forwarded-proto': 'https' },
        {
          host: 'internal:3000',
          'x-forwarded-host': 'localhost:8015',
          'x-forwarded-proto': 'https',
          'x-forwarded-prefix': '/manage-recycling-obligations'
        }
      ]) {
        const response = await server.inject({
          url: `/signin-oidc?${callbackQuery}`,
          headers
        })
        expect(response.statusCode).toBe(200)
        expect(response.payload).toContain(
          `https://${headers['x-forwarded-host'] || headers.host}${headers['x-forwarded-prefix'] || ''}/signin-oidc?${callbackQuery}&refresh=1`
        )
      }
      const denied = await server.inject({
        url: '/signin-oidc',
        headers: { host: 'service.defra.gov.uk' }
      })
      expect(denied.statusCode).toBe(400)
    } finally {
      config.set('auth.azureAdB2c.allowedHosts', previous)
    }
  })
})
