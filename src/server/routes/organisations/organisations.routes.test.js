import { vi } from 'vitest'

import { EPR_PACKAGING_BASIC_USER_SERVICE_ROLE } from '#/server/auth/constants.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
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
import { getNonPrefixedServiceLinkHrefs } from '#/test-helpers/proxy-link-assertions.js'

const organisationId = MOCK_AUTH_ORGANISATION_ID
const schemeId = MOCK_COMPLIANCE_SCHEME_ID
const unauthorisedOrganisationId = '923fa611-571c-4948-ab7d-fbb75e75ed65'
const unauthorisedSchemeId = '923fa611-571c-4948-ab7d-fbb75e75ed66'
const prnId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'
const FORWARDED_PREFIX = '/manage-recycling-obligations'

function buildPrn(overrides = {}) {
  return {
    id: prnId,
    number: 'PRN123',
    type: 'PRN',
    status: 'Accepted',
    material: 'Plastic',
    tonnage: 75,
    obligationYear: 2026,
    issuedAt: '2026-04-02',
    issuer: { organisationName: 'Reprocessor Ltd' },
    authorisedBy: { name: 'Jane Doe', position: 'Director' },
    accreditationNumber: 'AN-123',
    reprocessingSite: 'Reprocessing Site A',
    ...overrides
  }
}

function buildPrnsResponse(prns = [buildPrn()]) {
  return { prns, total: prns.length, page: 1, pageSize: 20 }
}

function buildOrganisation(overrides = {}) {
  return {
    id: organisationId,
    name: 'Example Operator Ltd',
    businessCountry: 'GB-ENG',
    ...overrides
  }
}

describe('organisations routes', () => {
  let server
  let authHeaders

  const getOrganisationMock = vi.fn()
  const getOrganisationPrnsMock = vi.fn()
  const getPrnMock = vi.fn()

  beforeAll(async () => {
    ;({ server, authHeaders } = await startAuthenticatedTestServer())
  })

  beforeEach(() => {
    getOrganisationMock.mockReset().mockResolvedValue(buildOrganisation())
    getOrganisationPrnsMock.mockReset().mockResolvedValue(buildPrnsResponse())
    getPrnMock.mockReset().mockResolvedValue(buildPrn())

    server.app.wasteOrganisationsApi = { getOrganisation: getOrganisationMock }
    server.app.wasteObligationsApi = {
      getOrganisationPrns: getOrganisationPrnsMock,
      getPrn: getPrnMock
    }
  })

  afterAll(async () => {
    await stopTestServer(server)
  })

  describe('producer PRNs list', () => {
    const url = `/organisations/producer/${organisationId}/prns`

    test('renders the PRNs table for the organisation', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(getOrganisationPrnsMock).toHaveBeenCalledWith(
        organisationId,
        expect.any(Object)
      )
      expect(result).toEqual(expect.stringContaining('PRNs and PERNs'))
      expect(result).toEqual(expect.stringContaining('PRN123'))
      expect(result).toEqual(
        expect.stringContaining(
          `href="/organisations/producer/${organisationId}/prns/${prnId}?year=2026"`
        )
      )
    })

    test('shows the empty state when the organisation has no PRNs', async () => {
      getOrganisationPrnsMock.mockResolvedValue(buildPrnsResponse([]))

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          'No PRNs or PERNs were found for this organisation.'
        )
      )
    })

    test('prefixes the row view links for a reverse proxy', async () => {
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
          `href="${FORWARDED_PREFIX}/organisations/producer/${organisationId}/prns/${prnId}?year=2026"`
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
          url: `/organisations/producer/${unauthorisedOrganisationId}/prns`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(getOrganisationPrnsMock).not.toHaveBeenCalled()
    })

    test('returns 400 when the organisation id is not a GUID', async () => {
      const { statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: '/organisations/producer/not-a-guid/prns' },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(getOrganisationPrnsMock).not.toHaveBeenCalled()
    })
  })

  describe('producer PRN detail', () => {
    const url = `/organisations/producer/${organisationId}/prns/${prnId}?year=2026`

    test('renders the PRN with a back link to the list', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(getPrnMock).toHaveBeenCalledWith(organisationId, prnId)
      expect(result).toEqual(expect.stringContaining('PRN123'))
      expect(result).toEqual(
        expect.stringContaining(
          `href="/organisations/producer/${organisationId}/prns"`
        )
      )
    })

    test('loads without a year query param, falling back to the PRN obligation year', async () => {
      getPrnMock.mockResolvedValue(buildPrn({ obligationYear: 2024 }))

      const { result, statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/organisations/producer/${organisationId}/prns/${prnId}`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('2024'))
    })

    test('prefixes the back link for a reverse proxy', async () => {
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
          `href="${FORWARDED_PREFIX}/organisations/producer/${organisationId}/prns"`
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
          url: `/organisations/producer/${unauthorisedOrganisationId}/prns/${prnId}?year=2026`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(getPrnMock).not.toHaveBeenCalled()
    })

    test('returns 400 when the PRN id is not a GUID', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/organisations/producer/${organisationId}/prns/not-a-guid?year=2026`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(getPrnMock).not.toHaveBeenCalled()
    })
  })

  describe('CSO PRNs list', () => {
    const url = `/organisations/cso/${schemeId}/prns`

    test('renders the PRNs table for the scheme', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(getOrganisationPrnsMock).toHaveBeenCalledWith(
        schemeId,
        expect.any(Object)
      )
      expect(result).toEqual(
        expect.stringContaining(
          `href="/organisations/cso/${schemeId}/prns/${prnId}?year=2026"`
        )
      )
    })

    test('prefixes the row view links for a reverse proxy', async () => {
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
          `href="${FORWARDED_PREFIX}/organisations/cso/${schemeId}/prns/${prnId}?year=2026"`
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
          url: `/organisations/cso/${unauthorisedSchemeId}/prns`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(getOrganisationPrnsMock).not.toHaveBeenCalled()
    })
  })

  describe('CSO PRN detail', () => {
    const url = `/organisations/cso/${schemeId}/prns/${prnId}?year=2026`

    test('renders the PRN with a back link to the list', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(getPrnMock).toHaveBeenCalledWith(schemeId, prnId)
      expect(result).toEqual(
        expect.stringContaining(`href="/organisations/cso/${schemeId}/prns"`)
      )
    })

    test('prefixes the back link for a reverse proxy', async () => {
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
          `href="${FORWARDED_PREFIX}/organisations/cso/${schemeId}/prns"`
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
          url: `/organisations/cso/${unauthorisedSchemeId}/prns/${prnId}?year=2026`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(getPrnMock).not.toHaveBeenCalled()
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
      ['producer PRNs list', `/organisations/producer/${organisationId}/prns`],
      [
        'producer PRN detail',
        `/organisations/producer/${organisationId}/prns/${prnId}?year=2026`
      ],
      ['CSO PRNs list', `/organisations/cso/${schemeId}/prns`],
      [
        'CSO PRN detail',
        `/organisations/cso/${schemeId}/prns/${prnId}?year=2026`
      ]
    ])('returns 403 for basic users on the %s page', async (_label, url) => {
      const { statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        basicUserAuthHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })
  })
})
