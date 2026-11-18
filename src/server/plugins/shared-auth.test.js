import Hapi from '@hapi/hapi'
import { vi } from 'vitest'

import { applyForwardedPrefixToCookiePath } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { signSharedAuthToken } from '#/server/auth/shared-auth-token.js'

const settings = vi.hoisted(() => ({
  sharedAuth: {
    mode: 'token',
    cookieName: 'epr-shared-auth',
    secret: 'a-shared-secret',
    issuer: 'epr-cdp-frontends',
    ttl: 60_000
  }
}))
const loadUserOrganisationsMock = vi.hoisted(() => vi.fn())
const isEligibleMock = vi.hoisted(() => vi.fn())
const isPublicPathMock = vi.hoisted(() => vi.fn())

vi.mock('#/config/config.js', () => ({
  config: {
    get: (key) => {
      if (key === 'sharedAuth') return settings.sharedAuth
      if (key === 'session.cookie.secure') return false
      return undefined
    }
  }
}))
vi.mock('#/server/routes/auth/sign-in-oidc.js', () => ({
  getUserIdFromProfile: (profile) => profile?.sub || profile?.oid || null,
  loadUserOrganisations: loadUserOrganisationsMock
}))
vi.mock('#/server/auth/user-organisations-validation.js', () => ({
  isEligibleForObligationsLogin: isEligibleMock
}))
vi.mock('#/server/auth/public-paths.js', () => ({
  isPublicPath: isPublicPathMock
}))

const { sharedAuth, setSharedAuthCookie, clearSharedAuthCookie } =
  await import('./shared-auth.js')

const USER = 'user-1'
const ORGANISATIONS = { user: { id: USER, service: 'EPR Packaging' } }

function token(overrides = {}) {
  return signSharedAuthToken(
    { sub: overrides.sub ?? USER },
    {
      secret: overrides.secret ?? settings.sharedAuth.secret,
      issuer: settings.sharedAuth.issuer,
      ttl: settings.sharedAuth.ttl
    }
  )
}

function createYar(values = {}) {
  const store = new Map(Object.entries(values))
  return {
    get: (key) => store.get(key),
    set: vi.fn((key, value) => store.set(key, value)),
    reset: vi.fn(() => store.clear())
  }
}

function registerHook() {
  const server = {
    ext: vi.fn(),
    state: vi.fn(),
    logger: { warn: vi.fn() }
  }
  sharedAuth.plugin.register(server)
  return { server, hook: server.ext.mock.calls[0]?.[1] }
}

function createRequest({ cookie, yar = createYar(), path = '/producer' } = {}) {
  return {
    path,
    state: cookie === undefined ? {} : { 'epr-shared-auth': cookie },
    yar,
    logger: { info: vi.fn(), warn: vi.fn() }
  }
}

const h = { continue: Symbol('continue') }

describe('shared sign-in', () => {
  beforeEach(() => {
    settings.sharedAuth.mode = 'token'
    settings.sharedAuth.secret = 'a-shared-secret'
    loadUserOrganisationsMock.mockReset().mockResolvedValue(ORGANISATIONS)
    isEligibleMock.mockReset().mockReturnValue(true)
    isPublicPathMock.mockReset().mockReturnValue(false)
  })

  describe('with the token mode on', () => {
    test('registers the token cookie for the whole host', () => {
      const { server } = registerHook()

      expect(server.state).toHaveBeenCalledWith(
        'epr-shared-auth',
        expect.objectContaining({ path: '/', isHttpOnly: true })
      )
    })

    test('builds a session from a valid token without asking B2C', async () => {
      const { hook } = registerHook()
      const request = createRequest({ cookie: token() })

      expect(await hook(request, h)).toBe(h.continue)

      expect(loadUserOrganisationsMock).toHaveBeenCalledWith(request, USER)
      expect(request.yar.get('credentials')).toEqual({
        provider: 'shared-auth-token',
        profile: { sub: USER }
      })
      expect(request.yar.get('user')).toBe(ORGANISATIONS.user)
    })

    test('builds no session for a user who may not use the service', async () => {
      isEligibleMock.mockReturnValue(false)
      const { hook } = registerHook()
      const request = createRequest({ cookie: token() })

      await hook(request, h)

      expect(request.yar.get('credentials')).toBeUndefined()
    })

    test('builds no session when the account service fails', async () => {
      loadUserOrganisationsMock.mockRejectedValue(new Error('down'))
      const { hook } = registerHook()
      const request = createRequest({ cookie: token() })

      expect(await hook(request, h)).toBe(h.continue)
      expect(request.yar.get('credentials')).toBeUndefined()
    })

    test('builds no session from a token signed with another key', async () => {
      const { hook } = registerHook()
      const request = createRequest({ cookie: token({ secret: 'another' }) })

      await hook(request, h)

      expect(loadUserOrganisationsMock).not.toHaveBeenCalled()
      expect(request.yar.get('credentials')).toBeUndefined()
    })

    test('keeps a session whose token names the same user', async () => {
      const { hook } = registerHook()
      const yar = createYar({ credentials: { profile: { sub: USER } } })

      await hook(createRequest({ cookie: token(), yar }), h)

      expect(yar.reset).not.toHaveBeenCalled()
      expect(loadUserOrganisationsMock).not.toHaveBeenCalled()
    })

    test('drops a session once the token has gone (signed out elsewhere)', async () => {
      const { hook } = registerHook()
      const yar = createYar({ credentials: { profile: { sub: USER } } })

      await hook(createRequest({ yar }), h)

      expect(yar.reset).toHaveBeenCalled()
    })

    test('drops a session when the token names another user', async () => {
      const { hook } = registerHook()
      const yar = createYar({ credentials: { profile: { sub: USER } } })

      await hook(createRequest({ cookie: token({ sub: 'user-2' }), yar }), h)

      expect(yar.reset).toHaveBeenCalled()
    })

    test('leaves public pages alone', async () => {
      isPublicPathMock.mockReturnValue(true)
      const { hook } = registerHook()
      const yar = createYar({ credentials: { profile: { sub: USER } } })

      await hook(createRequest({ yar, path: '/health' }), h)

      expect(yar.reset).not.toHaveBeenCalled()
    })

    test('writes the token at sign-in and clears it at sign-out', () => {
      const toolkit = { state: vi.fn(), unstate: vi.fn() }

      setSharedAuthCookie(toolkit, USER)
      clearSharedAuthCookie(toolkit)

      expect(toolkit.state).toHaveBeenCalledWith(
        'epr-shared-auth',
        expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/)
      )
      expect(toolkit.unstate).toHaveBeenCalledWith('epr-shared-auth')
    })

    test('adds no check when no key is set, so sessions are not dropped', () => {
      settings.sharedAuth.secret = ''
      const { server } = registerHook()

      expect(server.ext).not.toHaveBeenCalled()
      expect(server.logger.warn).toHaveBeenCalled()
    })

    test('writes no token when no key is set', () => {
      settings.sharedAuth.secret = ''
      const toolkit = { state: vi.fn() }

      setSharedAuthCookie(toolkit, USER)

      expect(toolkit.state).not.toHaveBeenCalled()
    })
  })

  describe('with the token mode off', () => {
    beforeEach(() => {
      settings.sharedAuth.mode = 'off'
    })

    test('adds no cookie and no check', () => {
      const { server } = registerHook()

      expect(server.state).not.toHaveBeenCalled()
      expect(server.ext).not.toHaveBeenCalled()
    })

    test('neither writes nor clears a token', () => {
      const toolkit = { state: vi.fn(), unstate: vi.fn() }

      setSharedAuthCookie(toolkit, USER)
      clearSharedAuthCookie(toolkit)

      expect(toolkit.state).not.toHaveBeenCalled()
      expect(toolkit.unstate).not.toHaveBeenCalled()
    })
  })

  test('behind the proxy, the token cookie is set at path / rather than the forwarded prefix', async () => {
    const server = Hapi.server({
      state: { contextualize: applyForwardedPrefixToCookiePath }
    })
    sharedAuth.plugin.register(server)
    server.route({
      method: 'GET',
      path: '/signed-in',
      handler: (_request, toolkit) => {
        setSharedAuthCookie(toolkit, USER)
        return 'ok'
      }
    })

    const response = await server.inject({
      url: '/signed-in',
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
    })

    const cookie = response.headers['set-cookie'].find((c) =>
      c.startsWith('epr-shared-auth=')
    )
    expect(cookie).toMatch(/Path=\/(;|$)/)
    expect(cookie).not.toContain('manage-recycling-obligations')
  })
})
