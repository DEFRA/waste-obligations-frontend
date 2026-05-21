import { vi } from 'vitest'

import { paths } from '#/config/paths.js'
import { BELL_AZURE_AD_B2C_COOKIE } from '#/server/auth/azure-ad-b2c.js'
import {
  SIGN_IN_FAILED_HEADING_KEY,
  SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY,
  SIGN_IN_FAILED_NO_USER_ID_MESSAGE_KEY
} from '#/server/auth/constants.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import {
  signInOidcController,
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
  const view = vi.fn((template, context) => ({
    type: 'view',
    template,
    context,
    code(statusCode) {
      return { type: 'view', template, context, statusCode }
    }
  }))
  return {
    redirect: vi.fn((location) => ({ type: 'redirect', location })),
    view,
    unstate
  }
}

function createRequest(overrides = {}) {
  const yarStore = new Map()
  return {
    auth: overrides.auth,
    logger: { warn: vi.fn() },
    yar: overrides.yar ?? {
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
          redirectUri: 'https://localhost:8010/signin-oidc',
          postLogoutRedirectPath: '/signed-out'
        }
      }
      return undefined
    })
  })

  describe('signInOidcController', () => {
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

      signInOidcController.handler(request, h)

      expect(request.yar.get('user')).toEqual(request.auth.credentials)
      expect(h.redirect).toHaveBeenCalledWith(paths.home)
    })

    test('redirects to a safe stored return URL', () => {
      const request = createRequest({
        auth: { credentials: { profile: { sub: 'user-1' } } }
      })
      request.yar.set('authReturnUrl', '/compliance/org/certificate?year=2024')
      const h = createHStub()

      signInOidcController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(
        '/compliance/org/certificate?year=2024'
      )
      expect(request.yar.get('authReturnUrl')).toBeUndefined()
    })

    test('appends lang to return URL when session locale is Welsh', () => {
      const request = createRequest({
        auth: { credentials: { profile: { sub: 'user-1' } } }
      })
      request.yar.set('authReturnUrl', '/compliance/org/certificate?year=2024')
      request.yar.set('authLocale', 'cy')
      const h = createHStub()

      signInOidcController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(
        '/compliance/org/certificate?year=2024&lang=cy'
      )
    })

    test('ignores unsafe stored return URLs', () => {
      const request = createRequest({
        auth: { credentials: { profile: { sub: 'user-1' } } }
      })
      request.yar.set('authReturnUrl', 'https://evil.example')
      const h = createHStub()

      signInOidcController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(paths.home)
    })

    test('renders sign-in failed when B2C returns no credentials', () => {
      const request = createRequest({ auth: {} })
      const h = createHStub()

      const response = signInOidcController.handler(request, h)

      expect(request.logger.warn).toHaveBeenCalledWith(
        'Azure AD B2C sign-in completed without credentials'
      )
      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: translate('en', SIGN_IN_FAILED_HEADING_KEY),
        heading: translate('en', SIGN_IN_FAILED_HEADING_KEY),
        message: translate('en', SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY)
      })
      expect(response.statusCode).toBe(statusCodes.unauthorized)
    })

    test('renders sign-in failed in Welsh when lang=cy', () => {
      const request = createRequest({
        auth: {},
        query: { lang: 'cy' }
      })
      const h = createHStub()

      signInOidcController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: translate('cy', SIGN_IN_FAILED_HEADING_KEY),
        heading: translate('cy', SIGN_IN_FAILED_HEADING_KEY),
        message: translate('cy', SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY)
      })
    })

    test('renders sign-in failed when token has no user identifier', () => {
      const request = createRequest({
        auth: { credentials: { token: 'access', profile: {} } }
      })
      const h = createHStub()

      const response = signInOidcController.handler(request, h)

      expect(request.logger.warn).toHaveBeenCalledWith(
        'Azure AD B2C sign-in completed without a user identifier in the token'
      )
      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: translate('en', SIGN_IN_FAILED_HEADING_KEY),
        heading: translate('en', SIGN_IN_FAILED_HEADING_KEY),
        message: translate('en', SIGN_IN_FAILED_NO_USER_ID_MESSAGE_KEY)
      })
      expect(response.statusCode).toBe(statusCodes.unauthorized)
    })

    test('accepts oid when sub is missing', () => {
      const request = createRequest({
        auth: { credentials: { profile: { oid: 'oid-only-user' } } }
      })
      const h = createHStub()

      signInOidcController.handler(request, h)

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

    test('continues when yar session is not available', () => {
      const request = createRequest({ yar: undefined })
      const h = createHStub()

      signOutController.handler(request, h)

      expect(h.unstate).toHaveBeenCalledWith(BELL_AZURE_AD_B2C_COOKIE)
      expect(h.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/oauth2/v2.0/logout')
      )
    })

    test('redirects to signed-out when B2C authority is not configured', () => {
      configGetMock.mockImplementation((key) => {
        if (key === 'auth.azureAdB2c') {
          return { redirectUri: '/signin-oidc' }
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

      expect(h.view).toHaveBeenCalledWith('auth/signed-out/index')
    })
  })
})
