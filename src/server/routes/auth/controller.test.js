import { vi } from 'vitest'

import { paths } from '#/config/paths.js'
import { BELL_AZURE_AD_B2C_COOKIE } from '#/server/auth/azure-ad-b2c.js'
import {
  authCallbackController,
  signOutController,
  signedOutController
} from './controller.js'

const configGetMock = vi.hoisted(() => vi.fn())

vi.mock('#/config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

function createHStub() {
  const unstate = vi.fn()
  return {
    redirect: vi.fn((location) => ({ type: 'redirect', location })),
    view: vi.fn((template, context) => ({ type: 'view', template, context })),
    unstate
  }
}

function createRequest(overrides = {}) {
  const yarStore = new Map()
  return {
    auth: overrides.auth,
    yar: {
      get: (key) => yarStore.get(key),
      set: (key, value) => yarStore.set(key, value),
      clear: (key) => yarStore.delete(key),
      reset: vi.fn(() => yarStore.clear())
    },
    headers: overrides.headers ?? {},
    server: {
      info: { protocol: overrides.protocol ?? 'http' },
      settings: { tls: overrides.tls }
    },
    info: { host: overrides.host ?? 'localhost:8010' },
    ...overrides
  }
}

describe('auth controllers', () => {
  beforeEach(() => {
    configGetMock.mockReset()
    configGetMock.mockImplementation((key) => {
      if (key === 'auth.azureAdB2c') {
        return {
          instance: 'https://tenant.b2clogin.com',
          domain: 'tenant.onmicrosoft.com',
          userFlow: 'B2C_1A_EPR_SignUpSignIn',
          redirectUri: 'https://localhost:8010/auth/callback',
          postLogoutRedirectPath: '/signed-out'
        }
      }
      return undefined
    })
  })

  describe('authCallbackController', () => {
    test('stores credentials and redirects home by default', () => {
      const request = createRequest({
        auth: {
          credentials: {
            token: 'access',
            profile: { sub: 'user-1' }
          }
        }
      })
      const h = createHStub()

      authCallbackController.handler(request, h)

      expect(request.yar.get('user')).toEqual(request.auth.credentials)
      expect(h.redirect).toHaveBeenCalledWith(paths.home)
    })

    test('redirects to a safe stored return URL', () => {
      const request = createRequest({
        auth: { credentials: { profile: { sub: 'user-1' } } }
      })
      request.yar.set('authReturnUrl', '/compliance/org/certificate?year=2024')
      const h = createHStub()

      authCallbackController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(
        '/compliance/org/certificate?year=2024'
      )
      expect(request.yar.get('authReturnUrl')).toBeUndefined()
    })

    test('ignores unsafe stored return URLs', () => {
      const request = createRequest({
        auth: { credentials: { profile: { sub: 'user-1' } } }
      })
      request.yar.set('authReturnUrl', 'https://evil.example')
      const h = createHStub()

      authCallbackController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(paths.home)
    })
  })

  describe('signOutController', () => {
    test('clears session and redirects to B2C logout when configured', () => {
      const request = createRequest({
        headers: { host: 'localhost:8010' }
      })
      const h = createHStub()

      signOutController.handler(request, h)

      expect(request.yar.reset).toHaveBeenCalled()
      expect(h.unstate).toHaveBeenCalledWith(BELL_AZURE_AD_B2C_COOKIE)
      expect(h.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/oauth2/v2.0/logout')
      )
      expect(h.redirect).toHaveBeenCalledWith(
        expect.stringContaining('post_logout_redirect_uri=')
      )
    })

    test('redirects to signed-out when B2C authority is not configured', () => {
      configGetMock.mockImplementation((key) => {
        if (key === 'auth.azureAdB2c') {
          return { redirectUri: '/auth/callback' }
        }
        return undefined
      })

      const request = createRequest()
      const h = createHStub()

      signOutController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(paths.signedOut)
    })
  })

  describe('signedOutController', () => {
    test('renders the signed out page', () => {
      const h = createHStub()

      signedOutController.handler(createRequest(), h)

      expect(h.view).toHaveBeenCalledWith('auth/signed-out/index', {
        pageTitle: 'Signed out',
        heading: 'Signed out',
        message: 'You have signed out of the obligations service.'
      })
    })
  })
})
