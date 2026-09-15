import Hapi from '@hapi/hapi'

import { config } from '#/config/config.js'
import { AZURE_AD_B2C_AUTH_STRATEGY } from '#/server/auth/azure-ad-b2c.js'
import { azureAdB2cAuth } from './azure-ad-b2c-auth.js'

const publicHost = 'service.example.gov.uk'
const callbackQuery = 'state=test-state&code=test-code'
const scenarios = [
  ['direct', {}],
  [
    'untrusted Host and scheme',
    { host: 'untrusted.example.com', 'x-forwarded-proto': 'http' }
  ],
  ['untrusted forwarded host', { 'x-forwarded-host': 'untrusted.example.com' }],
  [
    'forwarded host list',
    { 'x-forwarded-host': 'untrusted.example.com, service.example.gov.uk' }
  ],
  [
    'supported proxy',
    {
      host: 'waste-obligations-frontend:3000',
      'x-forwarded-host': publicHost,
      'x-forwarded-proto': 'https',
      'x-forwarded-prefix': '/manage-recycling-obligations'
    }
  ],
  [
    'proxy without forwarded host',
    {
      'x-forwarded-proto': 'https',
      'x-forwarded-prefix': '/manage-recycling-obligations'
    }
  ],
  [
    'proxy with untrusted forwarded host',
    {
      'x-forwarded-host': 'untrusted.example.com',
      'x-forwarded-proto': 'https',
      'x-forwarded-prefix': '/manage-recycling-obligations'
    }
  ]
]

function expectedCallback(headers) {
  const protocol = 'https'
  const prefix = headers['x-forwarded-prefix'] || ''
  return `${protocol}://${publicHost}${prefix}/signin-oidc`
}

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
      publicOrigin: `https://${publicHost}`,
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
    async (_name, forwardedHeaders) => {
      const headers = { host: publicHost, ...forwardedHeaders }
      const response = await server.inject({
        url: `/signin-oidc?${callbackQuery}`,
        headers
      })

      expect(response.statusCode).toBe(200)
      expect(response.payload).toBe(
        `<html><head><meta http-equiv="refresh" content="0;URL='${expectedCallback(headers)}?${callbackQuery}&refresh=1'"></head><body></body></html>`
      )
      expect(response.payload).not.toContain('untrusted.example.com')
    }
  )

  test.each(scenarios)(
    'sign-in completes with the public callback URL: %s',
    async (_name, forwardedHeaders) => {
      const headers = { host: publicHost, ...forwardedHeaders }
      const signIn = await server.inject({ url: '/signin-oidc', headers })
      expect(signIn.statusCode).toBe(302)
      const authorization = new URL(signIn.headers.location)
      expect(authorization.searchParams.get('redirect_uri')).toBe(
        expectedCallback(headers)
      )
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
      expect(tokenRedirectUri).toBe(expectedCallback(headers))
    }
  )
})
