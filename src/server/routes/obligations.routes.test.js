import { vi } from 'vitest'

import { config } from '#/config/config.js'
import { CONSENT_COOKIE_NAME } from '#/config/cookie-config.js'
import { EPR_PACKAGING_BASIC_USER_SERVICE_ROLE } from '#/server/auth/constants.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { mergeCookieHeaders } from '#/test-helpers/csrf-helper.js'
import {
  authenticate,
  injectAuthed,
  startAuthenticatedTestServer,
  stopTestServer
} from '#/test-helpers/auth-helper.js'
import { MOCK_AUTH_ORGANISATION_ID } from '#/test-helpers/auth-test-constants.js'
import {
  MOCK_COMPLIANCE_SCHEME_ID,
  createMockBackendAccountApiService
} from '#/test-helpers/mock-backend-account-api.js'
import { getComplianceYear } from '#/server/common/helpers/compliance-year.js'
import { getNonPrefixedServiceLinkHrefs } from '#/test-helpers/proxy-link-assertions.js'

const organisationId = MOCK_AUTH_ORGANISATION_ID
const schemeId = MOCK_COMPLIANCE_SCHEME_ID
const unauthorisedOrganisationId = '923fa611-571c-4948-ab7d-fbb75e75ed65'
const unauthorisedSchemeId = '923fa611-571c-4948-ab7d-fbb75e75ed66'
const FORWARDED_PREFIX = '/manage-recycling-obligations'
const currentYear = getComplianceYear()

function buildOrganisation(overrides = {}) {
  return {
    id: organisationId,
    name: 'Example Operator Ltd',
    businessCountry: 'GB-ENG',
    ...overrides
  }
}

function buildObligationsResponse() {
  return {
    obligations: [
      {
        material: 'Plastic',
        recyclingTarget: 0.75,
        tonnages: {
          material: 100,
          awaitingAcceptance: 10,
          accepted: 50,
          outstanding: 25,
          obligated: 75
        },
        status: 'NotMet'
      }
    ]
  }
}

function buildPrnsResponse() {
  return {
    prns: [
      { id: 'prn-1', obligationYear: currentYear },
      { id: 'prn-2', obligationYear: currentYear },
      { id: 'prn-3', obligationYear: currentYear }
    ],
    total: 3,
    page: 1,
    pageSize: 100
  }
}

describe('obligations routes', () => {
  let server
  let authHeaders
  let previousManageObligationsFlag
  let previousShowPrnsFlag

  const getOrganisationMock = vi.fn()
  const getOrganisationObligationsMock = vi.fn()
  const getOrganisationPrnsMock = vi.fn()

  beforeAll(async () => {
    previousManageObligationsFlag = config.get('features.manageObligations')
    previousShowPrnsFlag = config.get('features.showPrns')
    config.set('features.manageObligations', true)
    config.set('features.showPrns', true)
    ;({ server, authHeaders } = await startAuthenticatedTestServer())
  })

  beforeEach(() => {
    getOrganisationMock.mockReset().mockResolvedValue(buildOrganisation())
    getOrganisationObligationsMock
      .mockReset()
      .mockResolvedValue(buildObligationsResponse())
    getOrganisationPrnsMock.mockReset().mockResolvedValue(buildPrnsResponse())

    server.app.wasteOrganisationsApi = {
      getOrganisation: getOrganisationMock
    }
    server.app.wasteObligationsApi = {
      getOrganisationObligations: getOrganisationObligationsMock,
      getOrganisationPrns: getOrganisationPrnsMock
    }
  })

  afterAll(async () => {
    await stopTestServer(server)
    config.set('features.manageObligations', previousManageObligationsFlag)
    config.set('features.showPrns', previousShowPrnsFlag)
  })

  describe('producer obligations home', () => {
    const url = `/producer/${organisationId}/obligations?year=${currentYear}`

    test('renders the manage obligations page', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Manage your'))
      expect(result).toEqual(expect.stringContaining('recycling obligations'))
      expect(result).toEqual(expect.stringContaining('Example Operator Ltd'))
      expect(result).toEqual(
        expect.stringContaining('Environment Agency (England)')
      )
      expect(result).toEqual(expect.stringContaining('Plastic'))
      expect(result).toEqual(
        expect.stringContaining('aria-labelledby="how-to-meet-heading"')
      )
      expect(result).toEqual(
        expect.stringContaining('aria-labelledby="glass-heading"')
      )
      expect(result).toEqual(expect.stringContaining('scope="row"'))
      expect(result).toEqual(
        expect.stringContaining('Submit your certificate of compliance')
      )
      expect(result).toEqual(expect.stringContaining('Submit certificate'))
    })

    test('shows the awaiting acceptance count', async () => {
      const { result } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(result).toEqual(expect.stringContaining('3'))
      expect(result).toEqual(
        expect.stringContaining('Accept or reject PRNs and PERNs')
      )
    })

    test('hides accept/reject links when the feature flag is off', async () => {
      config.set('features.showPrns', false)

      try {
        const { result, statusCode } = await injectAuthed(
          server,
          { method: 'GET', url },
          authHeaders
        )

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).not.toEqual(
          expect.stringContaining('Accept or reject PRNs and PERNs')
        )
      } finally {
        config.set('features.showPrns', true)
      }
    })

    test('prefixes links for a reverse proxy', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url,
          headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          `href="${FORWARDED_PREFIX}/producer/${organisationId}/prns?year=${currentYear}"`
        )
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('returns 403 when the user is not enrolled in the organisation', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${unauthorisedOrganisationId}/obligations?year=${currentYear}`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    test('keeps Google Analytics on a 403 page when analytics consent is accepted', async () => {
      const previousKey = config.get('googleAnalytics.googleTagManagerKey')
      config.set('googleAnalytics.googleTagManagerKey', 'GTM-ABC123')
      const consent = Buffer.from(
        JSON.stringify({
          confirmed: true,
          essential: true,
          analytics: true
        })
      ).toString('base64')

      try {
        const { result, statusCode, headers } = await injectAuthed(
          server,
          {
            method: 'GET',
            url: `/producer/${unauthorisedOrganisationId}/obligations?year=${currentYear}`,
            headers: mergeCookieHeaders(authHeaders, {
              cookie: `${CONSENT_COOKIE_NAME}=${consent}; _ga=GA1.1.1`
            })
          },
          authHeaders
        )

        const setCookieHeaders = [headers['set-cookie']].flat().filter(Boolean)

        expect(statusCode).toBe(statusCodes.forbidden)
        expect(result).toEqual(
          expect.stringContaining('googletagmanager.com/gtm.js')
        )
        expect(
          setCookieHeaders.some(
            (header) =>
              header.startsWith('_ga=') && header.includes('01 Jan 1970')
          )
        ).toBe(false)
      } finally {
        config.set('googleAnalytics.googleTagManagerKey', previousKey)
      }
    })

    test('returns 400 when the organisation id is not a GUID', async () => {
      const { statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: '/producer/not-a-guid/obligations?year=2026' },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.badRequest)
    })
  })

  describe('CSO obligations home', () => {
    const url = `/cso/${schemeId}/obligations?year=${currentYear}`

    test('renders the manage obligations page for a scheme', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Manage your'))
      expect(result).toEqual(expect.stringContaining('recycling obligations'))
      expect(result).toEqual(
        expect.stringContaining('Submit your statement of compliance')
      )
      expect(result).toEqual(expect.stringContaining('Submit statement'))
    })

    test('prefixes links for a reverse proxy', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url,
          headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          `href="${FORWARDED_PREFIX}/cso/${schemeId}/prns?year=${currentYear}"`
        )
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('returns 403 when the user does not operate the scheme', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/cso/${unauthorisedSchemeId}/obligations?year=${currentYear}`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })

  describe('basic user permissions', () => {
    let basicUserAuthHeaders

    beforeAll(async () => {
      basicUserAuthHeaders = await authenticate(server, {
        serviceRole: EPR_PACKAGING_BASIC_USER_SERVICE_ROLE
      })
    })

    afterAll(() => {
      server.app.backendAccountApi = createMockBackendAccountApiService()
    })

    test.each([
      [
        'producer obligations',
        `/producer/${organisationId}/obligations?year=${currentYear}`
      ],
      ['CSO obligations', `/cso/${schemeId}/obligations?year=${currentYear}`]
    ])('returns 403 for basic users on the %s page', async (_label, url) => {
      const { statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        basicUserAuthHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })

  test('returns 400 for an invalid year query', async () => {
    const { statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/producer/${organisationId}/obligations?year=1999`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.badRequest)
  })

  test('returns 400 when year is missing', async () => {
    const { statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/producer/${organisationId}/obligations`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.badRequest)
  })
})

describe('obligations routes when manageObligations is disabled', () => {
  let server
  let authHeaders
  let previousManageObligationsFlag

  beforeAll(async () => {
    previousManageObligationsFlag = config.get('features.manageObligations')
    config.set('features.manageObligations', false)
    ;({ server, authHeaders } = await startAuthenticatedTestServer())
  })

  afterAll(async () => {
    await stopTestServer(server)
    config.set('features.manageObligations', previousManageObligationsFlag)
  })

  test.each([
    ['producer', `/producer/${organisationId}/obligations`],
    ['CSO', `/cso/${schemeId}/obligations`]
  ])('does not register the %s obligations route', async (_label, url) => {
    const { statusCode } = await injectAuthed(
      server,
      { method: 'GET', url },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
