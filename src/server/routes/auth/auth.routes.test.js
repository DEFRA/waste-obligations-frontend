import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  authenticate,
  cookieHeadersFromResponse,
  injectAuthed
} from '#/test-helpers/auth-helper.js'
import { paths } from '#/config/paths.js'

describe('auth routes', () => {
  let server
  let authHeaders

  beforeAll(async () => {
    server = await createServer()
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

  test('anonymous GET / redirects to sign-in', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: paths.home
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe(paths.signInOidc)
  })

  test('anonymous GET /compliance route redirects to sign-in', async () => {
    const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: `/compliance/producer/${organisationId}/certificate?year=2024`
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe(paths.signInOidc)
  })

  test('GET /signin-oidc establishes session and redirects home', async () => {
    const response = await server.inject({
      method: 'GET',
      url: paths.signInOidc
    })

    expect(response.statusCode).toBe(statusCodes.redirect)
    expect(response.headers.location).toBe(paths.home)
    expect(cookieHeadersFromResponse(response).cookie).toBeDefined()
  })

  test('authenticated GET / returns home page', async () => {
    const { statusCode, result } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: paths.home
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Home |'))
  })

  test('GET /signed-out renders signed out page', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: paths.signedOut
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Signed out |'))
  })

  test('GET /sign-out clears session and redirects to signed-out', async () => {
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

  test('sign-in returns user to the originally requested path', async () => {
    const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
    const returnPath = `/compliance/producer/${organisationId}/certificate?year=2024`

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
