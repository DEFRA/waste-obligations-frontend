import { vi } from 'vitest'

import { paths } from '#/config/paths.js'
import { getBellAzureAdB2cCookieName } from '#/server/auth/azure-ad-b2c.js'
import {
  EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
  EPR_PACKAGING_SERVICE_NAME,
  SIGN_IN_FAILED_ACCOUNT_SERVICE_ERROR_MESSAGE_KEY,
  SIGN_IN_FAILED_HEADING_KEY,
  SIGN_IN_FAILED_INVALID_SERVICE_MESSAGE_KEY,
  SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY,
  SIGN_IN_FAILED_NO_USER_ID_MESSAGE_KEY,
  SIGN_IN_FAILED_USER_NOT_FOUND_MESSAGE_KEY
} from '#/server/auth/constants.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { MOCK_AUTH_ORGANISATION_ID } from '#/test-helpers/auth-test-constants.js'
import {
  clearSessionController,
  signInOidcController,
  signOutController,
  signedOutController
} from './controller.js'

const configGetMock = vi.hoisted(() => vi.fn())
const oauthStateCookieName = 'test-oauth-state'

vi.mock('#/config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

const eligibleUserOrganisations = {
  user: {
    id: 'user-1',
    email: 'user@example.com',
    serviceRole: EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
    service: EPR_PACKAGING_SERVICE_NAME,
    organisations: [
      {
        id: MOCK_AUTH_ORGANISATION_ID,
        name: 'Example Organisation',
        organisationNumber: '154977'
      }
    ]
  }
}

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
  const getUserOrganisations = vi
    .fn()
    .mockResolvedValue(eligibleUserOrganisations)

  return {
    auth: overrides.auth,
    logger: { warn: vi.fn(), info: vi.fn() },
    app: { traceId: 'trace-1' },
    yar: overrides.yar ?? {
      get: (key) => yarStore.get(key),
      set: (key, value) => yarStore.set(key, value),
      clear: (key) => yarStore.delete(key),
      reset: vi.fn(() => yarStore.clear())
    },
    headers: overrides.headers ?? {},
    server: {
      info: { protocol: overrides.protocol ?? 'http' },
      settings: { tls: overrides.tls },
      app: {
        backendAccountApi: {
          getUserOrganisations:
            overrides.getUserOrganisations ?? getUserOrganisations
        }
      }
    },
    info: { host: overrides.host ?? 'localhost:8010' },
    ...overrides
  }
}

describe('auth controllers', () => {
  beforeEach(() => {
    configGetMock.mockReset()
    configGetMock.mockImplementation((key) => {
      if (key === 'auth.azureAdB2c.cookieName') {
        return oauthStateCookieName
      }
      if (key === 'auth.azureAdB2c') {
        return {
          instance: 'https://tenant.b2clogin.com',
          domain: 'tenant.onmicrosoft.com',
          userFlow: 'B2C_1A_EPR_SignUpSignIn',
          postLogoutRedirectPath: '/signed-out'
        }
      }
      if (key === 'eprPackaging.homeUrl') {
        return 'https://localhost:7084/report-data'
      }
      return undefined
    })
  })

  describe('signInOidcController', () => {
    test('stores session and redirects to packaging home by default', async () => {
      const request = createRequest({
        auth: {
          credentials: {
            token: 'access',
            profile: { sub: 'user-1' }
          }
        }
      })
      const h = createHStub()

      await signInOidcController.handler(request, h)

      expect(request.yar.get('credentials')).toEqual(request.auth.credentials)
      expect(request.yar.get('user')).toEqual(eligibleUserOrganisations.user)
      expect(
        request.server.app.backendAccountApi.getUserOrganisations
      ).toHaveBeenCalledWith('user-1')
      expect(h.redirect).toHaveBeenCalledWith(
        'https://localhost:7084/report-data'
      )
    })

    test('redirects to a safe stored return URL', async () => {
      const request = createRequest({
        auth: {
          credentials: {
            token: 'access',
            profile: { sub: 'user-1' }
          }
        }
      })
      request.yar.set(
        'authReturnUrl',
        '/compliance/producer/org/certificate?year=2024'
      )
      const h = createHStub()

      await signInOidcController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(
        '/compliance/producer/org/certificate?year=2024'
      )
      expect(request.yar.get('authReturnUrl')).toBeUndefined()
    })

    test('appends lang to return URL when session locale is Welsh', async () => {
      const request = createRequest({
        auth: {
          credentials: {
            token: 'access',
            profile: { sub: 'user-1' }
          }
        }
      })
      request.yar.set(
        'authReturnUrl',
        '/compliance/producer/org/certificate?year=2024'
      )
      request.yar.set('authLocale', 'cy')
      const h = createHStub()

      await signInOidcController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(
        '/compliance/producer/org/certificate?year=2024&lang=cy'
      )
    })

    test('ignores unsafe stored return URLs', async () => {
      const request = createRequest({
        auth: {
          credentials: {
            token: 'access',
            profile: { sub: 'user-1' }
          }
        }
      })
      request.yar.set('authReturnUrl', 'https://evil.example')
      const h = createHStub()

      await signInOidcController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(
        'https://localhost:7084/report-data'
      )
    })

    test('renders sign-in failed when B2C returns error query params', async () => {
      const request = createRequest({
        query: {
          error: 'access_denied',
          error_description: 'User cancelled',
          error_codes: '90091'
        }
      })
      const h = createHStub()

      const response = await signInOidcController.handler(request, h)

      expect(request.logger.warn).toHaveBeenCalledWith(
        'Azure AD B2C returned an error to the sign-in callback'
      )
      expect(h.unstate).toHaveBeenCalledWith(getBellAzureAdB2cCookieName())
      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: translate('en', SIGN_IN_FAILED_HEADING_KEY),
        heading: translate('en', SIGN_IN_FAILED_HEADING_KEY),
        message: translate('en', SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY)
      })
      expect(response.statusCode).toBe(statusCodes.unauthorized)
      expect(
        request.server.app.backendAccountApi.getUserOrganisations
      ).not.toHaveBeenCalled()
    })

    test('renders sign-in failed when B2C returns no credentials', async () => {
      const request = createRequest({ auth: {} })
      const h = createHStub()

      const response = await signInOidcController.handler(request, h)

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

    test('renders sign-in failed in Welsh when lang=cy', async () => {
      const request = createRequest({
        auth: {},
        query: { lang: 'cy' }
      })
      const h = createHStub()

      await signInOidcController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: translate('cy', SIGN_IN_FAILED_HEADING_KEY),
        heading: translate('cy', SIGN_IN_FAILED_HEADING_KEY),
        message: translate('cy', SIGN_IN_FAILED_NO_CREDENTIALS_MESSAGE_KEY)
      })
    })

    test('renders sign-in failed when token has no user identifier', async () => {
      const request = createRequest({
        auth: { credentials: { token: 'access', profile: {} } }
      })
      const h = createHStub()

      const response = await signInOidcController.handler(request, h)

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

    test('logs Bell auth errors from the auth property', async () => {
      const authError = {
        name: 'Error',
        message: 'Failed obtaining azure-ad-b2c access token',
        output: { statusCode: 500 }
      }
      const request = createRequest({
        auth: {
          isAuthenticated: false,
          error: authError,
          credentials: { provider: 'azure-ad-b2c' }
        }
      })
      const h = createHStub()

      await signInOidcController.handler(request, h)

      expect(request.logger.warn).toHaveBeenCalledWith(
        { err: authError },
        'Azure AD B2C sign-in failed during token exchange'
      )
    })

    test('renders sign-in failed when user is not in account service (AC1)', async () => {
      const request = createRequest({
        auth: {
          credentials: {
            token: 'access',
            profile: { sub: 'user-1' }
          }
        },
        getUserOrganisations: vi.fn().mockResolvedValue(null)
      })
      const h = createHStub()

      const response = await signInOidcController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: translate('en', SIGN_IN_FAILED_HEADING_KEY),
        heading: translate('en', SIGN_IN_FAILED_HEADING_KEY),
        message: translate('en', SIGN_IN_FAILED_USER_NOT_FOUND_MESSAGE_KEY)
      })
      expect(response.statusCode).toBe(statusCodes.unauthorized)
      expect(request.yar.get('credentials')).toBeUndefined()
      expect(request.yar.get('user')).toBeUndefined()
    })

    test('renders sign-in failed when service is not EPR Packaging (AC2)', async () => {
      const request = createRequest({
        auth: {
          credentials: {
            token: 'access',
            profile: { sub: 'user-1' }
          }
        },
        getUserOrganisations: vi.fn().mockResolvedValue({
          user: {
            email: 'user@example.com',
            service: 'Other Service',
            serviceRole: EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
            organisations: []
          }
        })
      })
      const h = createHStub()

      const response = await signInOidcController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: translate('en', SIGN_IN_FAILED_HEADING_KEY),
        heading: translate('en', SIGN_IN_FAILED_HEADING_KEY),
        message: translate('en', SIGN_IN_FAILED_INVALID_SERVICE_MESSAGE_KEY)
      })
      expect(response.statusCode).toBe(statusCodes.unauthorized)
      expect(request.yar.get('credentials')).toBeUndefined()
    })

    test('renders sign-in failed when account service errors', async () => {
      const request = createRequest({
        auth: {
          credentials: {
            token: 'access',
            profile: { sub: 'user-1' }
          }
        },
        getUserOrganisations: vi.fn().mockRejectedValue(new Error('upstream'))
      })
      const h = createHStub()

      const response = await signInOidcController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith('error/index', {
        pageTitle: translate('en', SIGN_IN_FAILED_HEADING_KEY),
        heading: translate('en', SIGN_IN_FAILED_HEADING_KEY),
        message: translate(
          'en',
          SIGN_IN_FAILED_ACCOUNT_SERVICE_ERROR_MESSAGE_KEY
        )
      })
      expect(response.statusCode).toBe(statusCodes.unauthorized)
    })

    test('accepts oid when sub is missing', async () => {
      const request = createRequest({
        auth: {
          credentials: {
            token: 'access',
            profile: { oid: 'oid-only-user' }
          }
        }
      })
      const h = createHStub()

      await signInOidcController.handler(request, h)

      expect(
        request.server.app.backendAccountApi.getUserOrganisations
      ).toHaveBeenCalledWith('oid-only-user')
      expect(h.redirect).toHaveBeenCalledWith(
        'https://localhost:7084/report-data'
      )
    })
  })

  describe('signOutController', () => {
    test('clears CDP session and redirects to packaging clear-session when configured', () => {
      configGetMock.mockImplementation((key) => {
        if (key === 'auth.azureAdB2c.cookieName') {
          return oauthStateCookieName
        }
        if (key === 'eprPackaging.clearSessionUrl') {
          return 'https://localhost:7084/report-data/Account/ClearSession'
        }
        if (key === 'eprPackaging.homeUrl') {
          return 'https://localhost:7084/report-data'
        }
        return undefined
      })

      const request = createRequest({
        headers: { host: 'localhost:8010' }
      })
      const h = createHStub()

      signOutController.handler(request, h)

      expect(request.yar.reset).toHaveBeenCalled()
      expect(h.unstate).toHaveBeenCalledWith(getBellAzureAdB2cCookieName())
      expect(h.redirect).toHaveBeenCalledWith(
        'https://localhost:7084/report-data/Account/ClearSession'
      )
    })

    test('continues when yar session is not available', () => {
      configGetMock.mockImplementation((key) => {
        if (key === 'auth.azureAdB2c.cookieName') {
          return oauthStateCookieName
        }
        if (key === 'eprPackaging.clearSessionUrl') {
          return 'https://localhost:7084/report-data/Account/ClearSession'
        }
        if (key === 'eprPackaging.homeUrl') {
          return 'https://localhost:7084/report-data'
        }
        return undefined
      })

      const request = createRequest({ yar: undefined })
      const h = createHStub()

      signOutController.handler(request, h)

      expect(h.unstate).toHaveBeenCalledWith(getBellAzureAdB2cCookieName())
      expect(h.redirect).toHaveBeenCalledWith(
        'https://localhost:7084/report-data/Account/ClearSession'
      )
    })

    test('redirects to an HTTP packaging clear-session URL when it matches the packaging home URL', () => {
      configGetMock.mockImplementation((key) => {
        if (key === 'auth.azureAdB2c.cookieName') {
          return oauthStateCookieName
        }
        if (key === 'eprPackaging.clearSessionUrl') {
          return 'http://localhost:7084/report-data/Account/ClearSession'
        }
        if (key === 'eprPackaging.homeUrl') {
          return 'http://localhost:7084/report-data'
        }
        return undefined
      })
      const request = createRequest()
      const h = createHStub()

      signOutController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(
        'http://localhost:7084/report-data/Account/ClearSession'
      )
    })

    test('signs out directly from B2C when packaging clear-session URL is not configured', () => {
      const request = createRequest()
      const h = createHStub()

      signOutController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(
        'https://tenant.b2clogin.com/tenant.onmicrosoft.com/B2C_1A_EPR_SignUpSignIn/oauth2/v2.0/logout?post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A8010%2Fsigned-out'
      )
      expect(request.logger.warn).toHaveBeenCalled()
    })

    test.each([
      [
        'does not use HTTP',
        'ftp://localhost:7084/report-data/Account/ClearSession',
        'https://localhost:7084/report-data'
      ],
      [
        'contains credentials',
        'https://username:password@localhost:7084/report-data/Account/ClearSession',
        'https://localhost:7084/report-data'
      ],
      [
        'has a different origin',
        'https://other.example/report-data/Account/ClearSession',
        'https://localhost:7084/report-data'
      ],
      [
        'uses a non-HTTP packaging home URL',
        'https://localhost:7084/report-data/Account/ClearSession',
        'ftp://localhost:7084/report-data'
      ],
      [
        'does not use the clear-session endpoint',
        'https://localhost:7084/report-data/not-a-real-endpoint',
        'https://localhost:7084/report-data'
      ]
    ])(
      'signs out directly from B2C when packaging clear-session URL %s',
      (_description, clearSessionUrl, packagingHomeUrl) => {
        configGetMock.mockImplementation((key) => {
          if (key === 'auth.azureAdB2c.cookieName') {
            return oauthStateCookieName
          }
          if (key === 'auth.azureAdB2c') {
            return {
              instance: 'https://tenant.b2clogin.com',
              domain: 'tenant.onmicrosoft.com',
              userFlow: 'B2C_1A_EPR_SignUpSignIn',
              postLogoutRedirectPath: '/signed-out'
            }
          }
          if (key === 'eprPackaging.homeUrl') {
            return packagingHomeUrl
          }
          if (key === 'eprPackaging.clearSessionUrl') {
            return clearSessionUrl
          }
          return undefined
        })
        const request = createRequest()
        const h = createHStub()

        signOutController.handler(request, h)

        expect(h.redirect).toHaveBeenCalledWith(
          'https://tenant.b2clogin.com/tenant.onmicrosoft.com/B2C_1A_EPR_SignUpSignIn/oauth2/v2.0/logout?post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A8010%2Fsigned-out'
        )
        expect(request.yar.reset).toHaveBeenCalled()
        expect(h.unstate).toHaveBeenCalledWith(getBellAzureAdB2cCookieName())
        expect(request.logger.warn).toHaveBeenCalled()
      }
    )

    test('redirects to local signed-out when direct B2C sign-out is not configured', () => {
      configGetMock.mockImplementation((key) => {
        if (key === 'auth.azureAdB2c.cookieName') {
          return oauthStateCookieName
        }
        if (key === 'auth.azureAdB2c') {
          return {}
        }
        return undefined
      })
      const request = createRequest()
      const h = createHStub()

      signOutController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(paths.signedOut)
    })

    test('uses the local signed-out path when B2C post-logout path is not configured', () => {
      configGetMock.mockImplementation((key) => {
        if (key === 'auth.azureAdB2c.cookieName') {
          return oauthStateCookieName
        }
        if (key === 'auth.azureAdB2c') {
          return {
            instance: 'https://tenant.b2clogin.com',
            domain: 'tenant.onmicrosoft.com',
            userFlow: 'B2C_1A_EPR_SignUpSignIn'
          }
        }
        return undefined
      })
      const request = createRequest()
      const h = createHStub()

      signOutController.handler(request, h)

      expect(h.redirect).toHaveBeenCalledWith(
        'https://tenant.b2clogin.com/tenant.onmicrosoft.com/B2C_1A_EPR_SignUpSignIn/oauth2/v2.0/logout?post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A8010%2Fsigned-out'
      )
    })
  })

  describe('clearSessionController', () => {
    test('clears CDP session and redirects to packaging sign-in when configured', () => {
      configGetMock.mockImplementation((key) => {
        if (key === 'auth.azureAdB2c.cookieName') {
          return oauthStateCookieName
        }
        if (key === 'eprPackaging.signInUrl') {
          return 'https://localhost:7084/report-data/Account/SignIn'
        }
        return undefined
      })

      const request = createRequest()
      const h = createHStub()

      clearSessionController.handler(request, h)

      expect(request.yar.reset).toHaveBeenCalled()
      expect(h.unstate).toHaveBeenCalledWith(getBellAzureAdB2cCookieName())
      expect(h.redirect).toHaveBeenCalledWith(
        'https://localhost:7084/report-data/Account/SignIn'
      )
    })

    test('redirects to signed-out when packaging sign-in URL is not configured', () => {
      const request = createRequest()
      const h = createHStub()

      clearSessionController.handler(request, h)

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
