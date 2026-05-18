import { vi } from 'vitest'

import { paths } from '#/config/paths.js'
import { requireAuth } from './require-auth.js'

const getUserFromRequestMock = vi.hoisted(() => vi.fn())
const isPublicPathMock = vi.hoisted(() => vi.fn())

vi.mock('#/server/auth/public-paths.js', () => ({
  isPublicPath: isPublicPathMock
}))

vi.mock('#/server/auth/user-session.js', () => ({
  getUserFromRequest: getUserFromRequestMock
}))

function createServerStub() {
  const handlers = []
  return {
    ext: vi.fn((event, handler) => {
      handlers.push({ event, handler })
    }),
    handlers
  }
}

describe('require-auth plugin', () => {
  beforeEach(() => {
    getUserFromRequestMock.mockReset()
    isPublicPathMock.mockReset()
  })

  test('register adds onPreAuth extension', () => {
    const server = createServerStub()

    requireAuth.plugin.register(server)

    expect(server.ext).toHaveBeenCalledWith('onPreAuth', expect.any(Function))
  })

  test('allows public paths without checking session', async () => {
    const server = createServerStub()
    requireAuth.plugin.register(server)
    const handler = server.handlers[0].handler
    isPublicPathMock.mockReturnValue(true)

    const h = { continue: Symbol('continue') }
    const result = await handler(
      { path: paths.health, url: { search: '' }, yar: { set: vi.fn() } },
      h
    )

    expect(isPublicPathMock).toHaveBeenCalledWith(paths.health)
    expect(getUserFromRequestMock).not.toHaveBeenCalled()
    expect(result).toBe(h.continue)
  })

  test('allows authenticated requests', async () => {
    const server = createServerStub()
    requireAuth.plugin.register(server)
    const handler = server.handlers[0].handler
    isPublicPathMock.mockReturnValue(false)
    getUserFromRequestMock.mockReturnValue({ profile: { sub: 'user-1' } })

    const h = { continue: Symbol('continue') }
    const result = await handler(
      { path: paths.home, url: { search: '' }, yar: { set: vi.fn() } },
      h
    )

    expect(result).toBe(h.continue)
  })

  test('stores safe return URL and redirects anonymous users to sign-in', async () => {
    const server = createServerStub()
    requireAuth.plugin.register(server)
    const handler = server.handlers[0].handler
    isPublicPathMock.mockReturnValue(false)
    getUserFromRequestMock.mockReturnValue(null)

    const yarSet = vi.fn()
    const h = {
      continue: vi.fn(),
      redirect: vi.fn().mockReturnValue({
        takeover: vi.fn().mockReturnValue('redirect')
      })
    }

    const result = await handler(
      {
        path: '/compliance/org/certificate',
        url: { search: '?year=2024' },
        yar: { set: yarSet }
      },
      h
    )

    expect(yarSet).toHaveBeenCalledWith(
      'authReturnUrl',
      '/compliance/org/certificate?year=2024'
    )
    expect(h.redirect).toHaveBeenCalledWith(paths.signinOidc)
    expect(result).toBe('redirect')
  })

  test('does not store unsafe return URLs', async () => {
    const server = createServerStub()
    requireAuth.plugin.register(server)
    const handler = server.handlers[0].handler
    isPublicPathMock.mockReturnValue(false)
    getUserFromRequestMock.mockReturnValue(null)

    const yarSet = vi.fn()
    const h = {
      redirect: vi.fn().mockReturnValue({
        takeover: vi.fn().mockReturnValue('redirect')
      })
    }

    await handler(
      {
        path: '//evil.example',
        url: { search: '' },
        yar: { set: yarSet }
      },
      h
    )

    expect(yarSet).not.toHaveBeenCalled()
  })
})
