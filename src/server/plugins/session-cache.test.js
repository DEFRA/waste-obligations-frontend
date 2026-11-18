import Hapi from '@hapi/hapi'
import { Engine as CatboxMemory } from '@hapi/catbox-memory'
import { vi } from 'vitest'

import { applyForwardedPrefixToCookiePath } from '#/server/common/helpers/proxy/forwarded-prefix.js'

const settings = vi.hoisted(() => ({ mode: 'off' }))

vi.mock('#/config/config.js', () => ({
  config: {
    get: (key) =>
      ({
        session: {
          cookie: {
            name: 'test-session',
            password: 'a-test-password-at-least-32-characters-long',
            ttl: 60_000
          },
          cache: { name: 'session', ttl: 60_000 }
        },
        'session.cookie.secure': false,
        'sharedAuth.mode': settings.mode
      })[key]
  }
}))

async function sessionCookieBehindProxy(mode) {
  settings.mode = mode
  vi.resetModules()
  const { sessionCache } = await import('./session-cache.js')

  const server = Hapi.server({
    cache: [{ name: 'session', engine: new CatboxMemory() }],
    state: { contextualize: applyForwardedPrefixToCookiePath }
  })
  await server.register(sessionCache)
  server.route({
    method: 'GET',
    path: '/page',
    handler: (request) => {
      request.yar.set('visited', true)
      return 'ok'
    }
  })
  await server.initialize()

  const response = await server.inject({
    url: '/page',
    headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
  })
  await server.stop()

  return response.headers['set-cookie'].find((c) =>
    c.startsWith('test-session=')
  )
}

describe('session cookie behind the reverse proxy', () => {
  test("is scoped to this frontend's path prefix by default", async () => {
    expect(await sessionCookieBehindProxy('off')).toContain(
      'Path=/manage-recycling-obligations'
    )
  })

  test('is scoped to the whole host when the session is shared', async () => {
    const cookie = await sessionCookieBehindProxy('session')

    expect(cookie).toMatch(/Path=\/(;|$)/)
    expect(cookie).not.toContain('manage-recycling-obligations')
  })

  test("is scoped to this frontend's path prefix in token mode", async () => {
    expect(await sessionCookieBehindProxy('token')).toContain(
      'Path=/manage-recycling-obligations'
    )
  })
})
