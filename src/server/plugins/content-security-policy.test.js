import { vi } from 'vitest'

import { config } from '#/config/config.js'
import { createTestServer } from '#/test-helpers/create-test-server.js'
import { getB2cOrigins } from '#/server/plugins/content-security-policy.js'
import { authenticate, injectAuthed } from '#/test-helpers/auth-helper.js'

describe('#contentSecurityPolicy', () => {
  describe('getB2cOrigins', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    test('includes B2C instance origin and tenant login host', () => {
      vi.spyOn(config, 'get').mockReturnValue({
        instance: 'https://tenant.b2clogin.com/',
        tenantName: 'tenant'
      })

      expect(getB2cOrigins()).toEqual([
        'https://tenant.b2clogin.com',
        'https://tenant.b2clogin.com'
      ])
    })

    test('ignores invalid instance URL and still adds tenant host', () => {
      vi.spyOn(config, 'get').mockReturnValue({
        instance: 'not-a-valid-url',
        tenantName: 'tenant'
      })

      expect(getB2cOrigins()).toEqual(['https://tenant.b2clogin.com'])
    })

    test('uses tenant name when instance is not configured', () => {
      vi.spyOn(config, 'get').mockReturnValue({
        tenantName: 'AZDCUSPOC2'
      })

      expect(getB2cOrigins()).toEqual(['https://AZDCUSPOC2.b2clogin.com'])
    })
  })

  describe('integration', () => {
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

    test('sets a CSP header without Google hosts when analytics is not configured', async () => {
      const resp = await injectAuthed(
        server,
        {
          method: 'GET',
          url: '/cookies'
        },
        authHeaders
      )

      expect(resp.headers['content-security-policy']).toBeDefined()
      expect(resp.headers['content-security-policy']).not.toContain(
        'googletagmanager.com'
      )
      expect(resp.headers['content-security-policy']).not.toContain(
        'google-analytics.com'
      )
      expect(resp.headers['content-security-policy']).toContain('nonce-')
    })

    test('allows Google hosts when analytics is configured', async () => {
      const previousKey = config.get('googleAnalytics.googleTagManagerKey')
      config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
      const analyticsServer = await createTestServer()
      await analyticsServer.initialize()

      try {
        const analyticsAuthHeaders = await authenticate(analyticsServer)
        const resp = await injectAuthed(
          analyticsServer,
          {
            method: 'GET',
            url: '/cookies'
          },
          analyticsAuthHeaders
        )

        expect(resp.headers['content-security-policy']).toContain(
          'googletagmanager.com'
        )
        expect(resp.headers['content-security-policy']).toContain(
          'google-analytics.com'
        )
        expect(resp.headers['content-security-policy']).toContain('nonce-')
      } finally {
        await analyticsServer.stop({ timeout: 0 })
        config.set('googleAnalytics.googleTagManagerKey', previousKey)
      }
    })
  })
})
