import { createTestServer } from '#/test-helpers/create-test-server.js'
import { config } from '#/config/config.js'
import { getBellAzureAdB2cCookieName } from '#/server/auth/azure-ad-b2c.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { CSRF_COOKIE_NAME } from '#/server/plugins/crumb.js'
import {
  authenticate,
  cookieHeadersFromResponse,
  injectAuthed
} from '#/test-helpers/auth-helper.js'
import { getNonPrefixedServiceLinkHrefs } from '#/test-helpers/proxy-link-assertions.js'
import { paths } from '#/config/paths.js'

describe('auth routes', () => {
  let server
  let authHeaders

  beforeAll(async () => {
    server = await createTestServer()
    await server.initialize()
    authHeaders = await authenticate(server)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET /health does not require authentication', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: paths.health
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual({ message: 'success' })
  })

  test('anonymous GET / returns not found', async () => {
    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test('anonymous GET /producer/{organisationId}/compliance/certificate redirects to sign-in', async () => {
    const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: `/producer/${organisationId}/compliance/certificate?year=2024`
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe(paths.signInOidc)
  })
  test('anonymous GET /producer/{organisationId}/prns/{prnId} redirects to sign-in', async () => {
    const organisationId = 'e2316c5e-d434-41da-8274-494dc0762d20'
    const prnId = '890d7fd5-b072-44a1-a182-10d04c85aab9'
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: `/producer/${organisationId}/prns/${prnId}?year=2024`
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe(paths.signInOidc)
  })

  test('GET /signin-oidc establishes session and redirects to packaging home', async () => {
    const response = await server.inject({
      method: 'GET',
      url: paths.signInOidc
    })

    expect(response.statusCode).toBe(statusCodes.redirect)
    expect(response.headers.location).toBe(config.get('eprPackaging.homeUrl'))
    expect(cookieHeadersFromResponse(response).cookie).toContain(
      `${config.get('session.cookie.name')}=`
    )
  })

  test('proxy-scopes cookies to the forwarded prefix', async () => {
    const response = await server.inject({
      method: 'GET',
      url: paths.signInOidc,
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
    })
    const cookies = Array.isArray(response.headers['set-cookie'])
      ? response.headers['set-cookie']
      : [response.headers['set-cookie']]

    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${config.get('session.cookie.name')}=`),
        expect.stringContaining(`${CSRF_COOKIE_NAME}=`)
      ])
    )
    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Path=/manage-recycling-obligations')
      ])
    )
    expect(
      cookies.every((cookie) =>
        cookie.includes('Path=/manage-recycling-obligations')
      )
    ).toBe(true)
  })

  test('prefixes rendered asset URLs for the proxy', async () => {
    const forwardedPrefix = '/manage-recycling-obligations'
    const response = await server.inject({
      method: 'GET',
      url: paths.signedOut,
      headers: { 'x-forwarded-prefix': forwardedPrefix }
    })

    expect(response.result).toEqual(
      expect.stringContaining('href="/manage-recycling-obligations/public/')
    )
    expect(response.result).toEqual(
      expect.stringContaining('src="/manage-recycling-obligations/public/')
    )
    expect(response.result).toEqual(
      expect.stringContaining(
        'href="/manage-recycling-obligations/signin-oidc"'
      )
    )
    expect(response.result).toEqual(
      expect.stringContaining(
        'href="/manage-recycling-obligations/signed-out?lang=cy"'
      )
    )
    expect(response.result).toEqual(
      expect.stringContaining('href="/manage-recycling-obligations/cookies"')
    )
    expect(
      getNonPrefixedServiceLinkHrefs(response.result, forwardedPrefix)
    ).toEqual([])
  })

  test('proxy-scopes cookie removals to the forwarded prefix', async () => {
    const proxyHeaders = {
      'x-forwarded-prefix': '/manage-recycling-obligations'
    }
    const signIn = await server.inject({
      method: 'GET',
      url: paths.signInOidc,
      headers: proxyHeaders
    })
    const signOut = await server.inject({
      method: 'GET',
      url: paths.signOut,
      headers: {
        ...proxyHeaders,
        ...cookieHeadersFromResponse(signIn)
      }
    })
    const cookies = Array.isArray(signOut.headers['set-cookie'])
      ? signOut.headers['set-cookie']
      : [signOut.headers['set-cookie']]

    expect(cookies).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${getBellAzureAdB2cCookieName()}=`)
      ])
    )
    expect(
      cookies.every((cookie) =>
        cookie.includes('Path=/manage-recycling-obligations')
      )
    ).toBe(true)
  })

  test('GET /signed-out renders signed out page', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: paths.signedOut
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Signed out |'))
    expect(result).toEqual(expect.stringContaining('epr-header--auth-only'))
    expect(result).toEqual(
      expect.stringContaining(`href="${paths.signInOidc}"`)
    )
    expect(result).not.toEqual(expect.stringContaining('Account/SignOut'))
  })

  test('authenticated header links to local sign-out', async () => {
    const { result } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: paths.cookies
      },
      authHeaders
    )

    expect(result).toEqual(expect.stringContaining(`href="${paths.signOut}"`))
    expect(result).not.toEqual(expect.stringContaining('epr-header--auth-only'))
    expect(result).not.toEqual(expect.stringContaining('Account/SignOut'))
  })

  test('GET /sign-out redirects to signed-out when packaging clear-session is not configured', async () => {
    const { statusCode, headers } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: paths.signOut
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe(paths.signedOut)
  })

  test('GET /clear-session clears session and redirects to packaging sign-in', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: paths.clearSession
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toMatch(/\/Account\/SignIn$/)
  })

  test('sign-in returns user to the originally requested path', async () => {
    const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
    const returnPath = `/producer/${organisationId}/compliance/certificate?year=2024`

    const challenge = await server.inject({
      method: 'GET',
      url: returnPath
    })
    const sessionCookie = cookieHeadersFromResponse(challenge).cookie

    const signIn = await server.inject({
      method: 'GET',
      url: paths.signInOidc,
      headers: { cookie: sessionCookie }
    })

    expect(signIn.statusCode).toBe(statusCodes.redirect)
    expect(signIn.headers.location).toBe(returnPath)
  })
})
