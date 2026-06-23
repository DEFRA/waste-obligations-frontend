import { vi } from 'vitest'

import { paths } from '#/config/paths.js'
import { requireAuth } from './require-auth.js'

const isPublicPathMock = vi.hoisted(() => vi.fn())

vi.mock('#/server/auth/public-paths.js', () => ({
  isPublicPath: isPublicPathMock
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

function createYar(overrides = {}) {
  const store = new Map()
  if (overrides.credentials !== undefined) {
    store.set('credentials', overrides.credentials)
  }

  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value)
  }
}

describe('require-auth plugin', () => {
  beforeEach(() => {
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
      { path: paths.health, url: { search: '' }, yar: createYar() },
      h
    )

    expect(isPublicPathMock).toHaveBeenCalledWith(paths.health)
    expect(result).toBe(h.continue)
  })

  test('allows authenticated requests when yar has credentials', async () => {
    const server = createServerStub()
    requireAuth.plugin.register(server)
    const handler = server.handlers[0].handler
    isPublicPathMock.mockReturnValue(false)

    const h = { continue: Symbol('continue') }
    const result = await handler(
      {
        path: paths.home,
        url: { search: '' },
        yar: createYar({ credentials: { token: 'access' } })
      },
      h
    )

    expect(result).toBe(h.continue)
  })

  test('stores safe return URL and redirects anonymous users to sign-in', async () => {
    const server = createServerStub()
    requireAuth.plugin.register(server)
    const handler = server.handlers[0].handler
    isPublicPathMock.mockReturnValue(false)

    const yar = createYar()
    const h = {
      continue: vi.fn(),
      redirect: vi.fn().mockReturnValue({
        takeover: vi.fn().mockReturnValue('redirect')
      })
    }

    const result = await handler(
      {
        path: '/compliance/producer/org/certificate',
        url: { search: '?year=2024' },
        yar
      },
      h
    )

    expect(yar.get('authReturnUrl')).toBe(
      '/compliance/producer/org/certificate?year=2024'
    )
    expect(h.redirect).toHaveBeenCalledWith(paths.signInOidc)
    expect(result).toBe('redirect')
  })

  test('preserves Welsh locale on sign-in redirect', async () => {
    const server = createServerStub()
    requireAuth.plugin.register(server)
    const handler = server.handlers[0].handler
    isPublicPathMock.mockReturnValue(false)

    const yar = createYar()
    const h = {
      redirect: vi.fn().mockReturnValue({
        takeover: vi.fn().mockReturnValue('redirect')
      })
    }

    await handler(
      {
        path: '/compliance/producer/org/certificate',
        url: { search: '?lang=cy' },
        query: { lang: 'cy' },
        yar
      },
      h
    )

    expect(yar.get('authLocale')).toBe('cy')
    expect(h.redirect).toHaveBeenCalledWith(`${paths.signInOidc}?lang=cy`)
  })

  test('does not store unsafe return URLs', async () => {
    const server = createServerStub()
    requireAuth.plugin.register(server)
    const handler = server.handlers[0].handler
    isPublicPathMock.mockReturnValue(false)

    const yar = createYar()
    const h = {
      redirect: vi.fn().mockReturnValue({
        takeover: vi.fn().mockReturnValue('redirect')
      })
    }

    await handler(
      {
        path: '//evil.example',
        url: { search: '' },
        yar
      },
      h
    )

    expect(yar.get('authReturnUrl')).toBeUndefined()
  })
})
