import { vi } from 'vitest'

import { config } from '#/config/config.js'
import { EPR_PACKAGING_BASIC_USER_SERVICE_ROLE } from '#/server/auth/constants.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  authenticate,
  cookieHeadersFromResponse,
  injectAuthed,
  startAuthenticatedTestServer,
  stopTestServer
} from '#/test-helpers/auth-helper.js'
import { CSRF_COOKIE_NAME } from '#/server/plugins/crumb.js'
import { MOCK_AUTH_ORGANISATION_ID } from '#/test-helpers/auth-test-constants.js'
import {
  MOCK_COMPLIANCE_SCHEME_ID,
  createMockBackendAccountApiService
} from '#/test-helpers/mock-backend-account-api.js'
import { getNonPrefixedServiceLinkHrefs } from '#/test-helpers/proxy-link-assertions.js'
import {
  extractCrumbFromHtml,
  injectAuthedPostForm,
  mergeCookieHeaders
} from '#/test-helpers/csrf-helper.js'

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
    status: 'AwaitingAcceptance',
    material: 'Plastic',
    tonnage: 75,
    obligationYear: 2026,
    decemberWaste: false,
    issuedAt: '2026-04-02',
    issuer: { organisationName: 'Reprocessor Ltd' },
    authorisedBy: { name: 'Jane Doe', position: 'Director' },
    accreditationNumber: 'AN-123',
    reprocessingSite: 'Reprocessing Site A',
    additionalNotes: 'Ref 345678F',
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

describe('prn routes', () => {
  let server
  let authHeaders
  let previousShowPrnsFlag

  const getOrganisationMock = vi.fn()
  const getOrganisationPrnsMock = vi.fn()
  const getPrnMock = vi.fn()
  const updatePrnStatusMock = vi.fn()

  beforeAll(async () => {
    previousShowPrnsFlag = config.get('features.showPrns')
    config.set('features.showPrns', true)
    ;({ server, authHeaders } = await startAuthenticatedTestServer())
  })

  beforeEach(() => {
    getOrganisationMock.mockReset().mockResolvedValue(buildOrganisation())
    getOrganisationPrnsMock.mockReset().mockResolvedValue(buildPrnsResponse())
    getPrnMock.mockReset().mockResolvedValue(buildPrn())
    updatePrnStatusMock.mockReset().mockResolvedValue(null)

    server.app.wasteOrganisationsApi = { getOrganisation: getOrganisationMock }
    server.app.wasteObligationsApi = {
      getOrganisationPrns: getOrganisationPrnsMock,
      getPrn: getPrnMock,
      updatePrnStatus: updatePrnStatusMock
    }
  })

  afterAll(async () => {
    await stopTestServer(server)
    config.set('features.showPrns', previousShowPrnsFlag)
  })

  describe('producer PRNs list', () => {
    const url = `/producer/${organisationId}/prns?year=2026`

    test('renders the awaiting-acceptance table for the organisation', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(getOrganisationPrnsMock).toHaveBeenCalledWith(organisationId, {
        search: undefined,
        status: 'AwaitingAcceptance',
        sort: undefined,
        page: undefined,
        pageSize: undefined
      })
      expect(result).toEqual(
        expect.stringContaining('Accept or reject PRNs and PERNs')
      )
      expect(result).not.toEqual(
        expect.stringContaining('Accept or reject PRNs and PERNs for ')
      )
      expect(result).toEqual(expect.stringContaining('PRN123'))
      expect(result).toEqual(expect.stringContaining('type="checkbox"'))
      expect(result).toEqual(
        expect.stringContaining('Accept selected PRNs and PERNs')
      )
      expect(result).toEqual(
        expect.stringContaining(
          `href="/producer/${organisationId}/prns/${prnId}?year=2026"`
        )
      )

      vi.useRealTimers()
    })

    test('shows the results range for a later page', async () => {
      getOrganisationPrnsMock.mockResolvedValue({
        prns: [buildPrn()],
        total: 21,
        page: 2,
        pageSize: 20
      })

      const { result, statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${organisationId}/prns?year=2026&page=2&pageSize=20`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Showing 21 to 21 of 21'))
      expect(result).not.toEqual(
        expect.stringContaining('Showing 1 to 1 of 21')
      )
    })

    test('shows Not provided for an empty issuer note', async () => {
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse([buildPrn({ additionalNotes: '' })])
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Not provided'))
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
          'You have no PRNs or PERNs awaiting acceptance.'
        )
      )
      expect(result).not.toEqual(
        expect.stringContaining('Accept selected PRNs and PERNs')
      )
    })

    test('hides checkboxes and the bulk-accept button when only multi-year December waste is listed', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse([
          buildPrn({
            decemberWaste: true,
            issuedAt: '2026-12-20'
          })
        ])
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('PRN123'))
      expect(result).not.toEqual(expect.stringContaining('type="checkbox"'))
      expect(result).not.toEqual(
        expect.stringContaining('Accept selected PRNs and PERNs')
      )

      vi.useRealTimers()
    })

    test('does not show the selection error on first load', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('id="selected-prns"'))
      expect(result).toEqual(expect.stringContaining('id="csrf-crumb"'))
      expect(result).not.toEqual(expect.stringContaining('There is a problem'))
      expect(result).not.toEqual(
        expect.stringContaining(
          'To accept multiple PRNs or PERNs select one or more using the check boxes'
        )
      )

      vi.useRealTimers()
    })

    test('POST without a selected PRN re-renders with the error summary', async () => {
      const { result, statusCode } = await injectAuthedPostForm(
        server,
        { url, payload: {} },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining(
          'To accept multiple PRNs or PERNs select one or more using the check boxes'
        )
      )
      expect(result).toEqual(expect.stringContaining('href="#selected-prns"'))
      expect(result).toEqual(
        expect.stringContaining('Error: Accept or reject PRNs and PERNs')
      )
    })

    test('POST with a selected PRN re-renders without the error summary', async () => {
      const { result, statusCode } = await injectAuthedPostForm(
        server,
        { url, payload: { selectedPrnIds: prnId } },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(expect.stringContaining('There is a problem'))
      expect(result).not.toEqual(
        expect.stringContaining(
          'To accept multiple PRNs or PERNs select one or more using the check boxes'
        )
      )
      expect(result).toEqual(
        expect.stringContaining('Accept selected PRNs and PERNs')
      )
    })

    test('POST without a valid CSRF crumb is rejected', async () => {
      const { statusCode } = await injectAuthed(
        server,
        { method: 'POST', url, payload: {} },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
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
          `href="${FORWARDED_PREFIX}/producer/${organisationId}/prns/${prnId}?year=2026"`
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
          url: `/producer/${unauthorisedOrganisationId}/prns?year=2026`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(getOrganisationPrnsMock).not.toHaveBeenCalled()
    })

    test('returns 400 when the organisation id is not a GUID', async () => {
      const { statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: '/producer/not-a-guid/prns?year=2026' },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(getOrganisationPrnsMock).not.toHaveBeenCalled()
    })

    test('loads without a year query', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${organisationId}/prns`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(getOrganisationPrnsMock).toHaveBeenCalled()
      expect(result).toEqual(
        expect.stringContaining('Accept or reject PRNs and PERNs')
      )
      expect(result).not.toEqual(
        expect.stringContaining('Accept or reject PRNs and PERNs for ')
      )
    })
  })

  describe('producer PRN detail', () => {
    const url = `/producer/${organisationId}/prns/${prnId}?year=2026`

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
          `href="/producer/${organisationId}/prns?year=2026"`
        )
      )
    })

    test('loads without a year query, using the PRN obligation year for display', async () => {
      getPrnMock.mockResolvedValue(buildPrn({ obligationYear: 2024 }))

      const { result, statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${organisationId}/prns/${prnId}`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(getPrnMock).toHaveBeenCalledWith(organisationId, prnId)
      expect(result).toEqual(expect.stringContaining('2024'))
      expect(result).toEqual(
        expect.stringContaining(
          `href="/producer/${organisationId}/prns?year=2024"`
        )
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
          `href="${FORWARDED_PREFIX}/producer/${organisationId}/prns?year=2026"`
        )
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('shows the accept button linking to confirm-accept for an awaiting-acceptance PRN, prefixed for a reverse proxy', async () => {
      getPrnMock.mockResolvedValue(buildPrn({ status: 'AwaitingAcceptance' }))

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
          `href="${FORWARDED_PREFIX}/producer/${organisationId}/prns/${prnId}/confirm-accept?year=2026"`
        )
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('hides the accept button for a resolved PRN', async () => {
      getPrnMock.mockResolvedValue(buildPrn({ status: 'Accepted' }))

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(expect.stringContaining('/confirm-accept'))
    })

    test('shows the success banner for an accepted PRN', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: 2026 })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('govuk-notification-banner--success')
      )
      expect(result).toEqual(
        expect.stringContaining(
          'You accepted this PRN towards your 2026 recycling obligations'
        )
      )
      expect(result).toEqual(
        expect.stringContaining(
          'You have accepted 75 tonnes towards your 2026 recycling obligation for Plastic material.'
        )
      )
    })

    test('shows the accept-more button for a resolved PRN, prefixed for a reverse proxy', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: 2026 })
      )

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
        expect.stringContaining('Accept or reject more PRNs and PERNs for 2026')
      )
    })

    test('keeps the accept-more link on the resolved PRN year, independent of the browsed back link, when they differ', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: 2024 })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Accept or reject more PRNs and PERNs for 2024')
      )
      expect(result).toEqual(
        expect.stringContaining(
          `href="/producer/${organisationId}/prns?year=2024"`
        )
      )
      expect(result).toEqual(
        expect.stringContaining(
          `href="/producer/${organisationId}/prns?year=2026"`
        )
      )
    })

    test('shows the obligations button for a resolved PRN when manageObligations is enabled, prefixed for a reverse proxy', async () => {
      const previousManageObligationsFlag = config.get(
        'features.manageObligations'
      )
      config.set('features.manageObligations', true)
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: 2026 })
      )

      try {
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
            'View your 2026 recycling obligations progress'
          )
        )
        expect(result).toEqual(
          expect.stringContaining(
            `href="${FORWARDED_PREFIX}/producer/${organisationId}/obligations?year=2026"`
          )
        )
      } finally {
        config.set('features.manageObligations', previousManageObligationsFlag)
      }
    })

    test('hides the obligations button for a resolved PRN when manageObligations is disabled', async () => {
      const previousManageObligationsFlag = config.get(
        'features.manageObligations'
      )
      config.set('features.manageObligations', false)
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: 2026 })
      )

      try {
        const { result, statusCode } = await injectAuthed(
          server,
          { method: 'GET', url },
          authHeaders
        )

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).not.toEqual(
          expect.stringContaining(
            'View your 2026 recycling obligations progress'
          )
        )
      } finally {
        config.set('features.manageObligations', previousManageObligationsFlag)
      }
    })

    test('hides the obligations button when no year is resolved, even if manageObligations is enabled', async () => {
      const previousManageObligationsFlag = config.get(
        'features.manageObligations'
      )
      config.set('features.manageObligations', true)
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: undefined })
      )

      try {
        const { result, statusCode } = await injectAuthed(
          server,
          {
            method: 'GET',
            url: `/producer/${organisationId}/prns/${prnId}`
          },
          authHeaders
        )

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).not.toEqual(
          expect.stringContaining('recycling obligations progress')
        )
      } finally {
        config.set('features.manageObligations', previousManageObligationsFlag)
      }
    })

    test('returns 403 when the user is not enrolled in the organisation', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${unauthorisedOrganisationId}/prns/${prnId}?year=2026`
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
          url: `/producer/${organisationId}/prns/not-a-guid?year=2026`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(getPrnMock).not.toHaveBeenCalled()
    })
  })

  describe('producer PRN confirm-accept', () => {
    const url = `/producer/${organisationId}/prns/${prnId}/confirm-accept?year=2026`

    beforeEach(() => {
      getPrnMock.mockResolvedValue(buildPrn({ status: 'AwaitingAcceptance' }))
    })

    test('renders the confirmation page with GDS layout, copy, Back link and Yes/No actions', async () => {
      const prnHref = `/producer/${organisationId}/prns/${prnId}?year=2026`
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Accept this PRN |'))
      expect(result).toEqual(
        expect.stringContaining('govuk-heading-l govuk-!-margin-bottom-7')
      )
      expect(result).toEqual(
        expect.stringContaining(
          'Are you sure you want to accept this PRN towards your 2026 recycling obligations?'
        )
      )
      expect(result).not.toEqual(expect.stringContaining('app-heading'))
      expect(result).toEqual(
        expect.stringContaining('govuk-body govuk-!-margin-bottom-7')
      )
      expect(result).toEqual(
        expect.stringContaining(
          'You will accept 75 tonnes towards your 2026 recycling obligation for plastic.'
        )
      )
      expect(result).toEqual(expect.stringContaining('govuk-button-group'))
      expect(result).toEqual(expect.stringContaining('Yes, accept'))
      expect(result).toEqual(expect.stringContaining('govuk-button--secondary'))
      expect(result).toEqual(expect.stringContaining(`href="${prnHref}"`))
      expect(result).toEqual(expect.stringContaining('No, go back'))
      expect(result).toEqual(expect.stringContaining('govuk-back-link'))
    })

    test('uses the singular "1 tonne" wording when the PRN is one tonne', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'AwaitingAcceptance', tonnage: 1 })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('You will accept 1 tonne ')
      )
      expect(result).not.toEqual(expect.stringContaining('1 tonnes'))
    })

    test('states the obligation year when the PRN carries one', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'AwaitingAcceptance', obligationYear: 2025 })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${organisationId}/prns/${prnId}/confirm-accept?year=2026`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('towards your 2025 recycling obligations')
      )
    })

    test('omits the year (never guesses one) when the PRN has no obligation year', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'AwaitingAcceptance', obligationYear: undefined })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Are you sure you want to accept this PRN?')
      )
      expect(result).toEqual(
        expect.stringContaining('towards your recycling obligation for plastic')
      )
      // no fabricated year and no "towards your 2026 recycling obligations"
      expect(result).not.toEqual(
        expect.stringContaining('recycling obligations?')
      )
      expect(result).not.toEqual(expect.stringContaining('undefined'))
    })

    test('prefixes the "No, go back" link for a reverse proxy', async () => {
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
          `href="${FORWARDED_PREFIX}/producer/${organisationId}/prns/${prnId}?year=2026"`
        )
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('omits the detail sentence (no broken/undefined text) when the PRN has no tonnage or material', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({
          status: 'AwaitingAcceptance',
          tonnage: undefined,
          material: undefined
        })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(expect.stringContaining('You will accept'))
      expect(result).not.toEqual(expect.stringContaining('undefined'))
      expect(result).toEqual(
        expect.stringContaining('Are you sure you want to accept')
      )
    })

    test('omits the detail sentence when tonnage is zero (treated as absent)', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({
          status: 'AwaitingAcceptance',
          tonnage: 0,
          material: 'Plastic'
        })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(expect.stringContaining('You will accept'))
      expect(result).toEqual(
        expect.stringContaining(
          'Are you sure you want to accept this PRN towards your 2026 recycling obligations?'
        )
      )
    })

    test('uses PERN wording when the note type is PERN', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'AwaitingAcceptance', type: 'PERN' })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Accept this PERN |'))
      expect(result).toEqual(
        expect.stringContaining(
          'Are you sure you want to accept this PERN towards your 2026 recycling obligations?'
        )
      )
    })

    test('redirects to the PRN detail page when the PRN is no longer editable', async () => {
      getPrnMock.mockResolvedValue(buildPrn({ status: 'Accepted' }))

      const { statusCode, headers } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `/producer/${organisationId}/prns/${prnId}?year=2026`
      )
    })

    test('POST accepts the PRN with the signed-in user and redirects to the PRN detail page', async () => {
      const { statusCode, headers } = await injectAuthedPostForm(
        server,
        { url },
        authHeaders
      )

      expect(updatePrnStatusMock).toHaveBeenCalledWith(organisationId, prnId, {
        status: 'ACCEPTED',
        user: expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
          name: expect.any(String),
          locale: 'en'
        })
      })
      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `/producer/${organisationId}/prns/${prnId}?year=2026`
      )
    })

    test('POST prefixes the post-accept redirect for a reverse proxy', async () => {
      const { statusCode, headers } = await injectAuthedPostForm(
        server,
        { url, headers: { 'x-forwarded-prefix': FORWARDED_PREFIX } },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `${FORWARDED_PREFIX}/producer/${organisationId}/prns/${prnId}?year=2026`
      )
    })

    test('POST without a valid CSRF crumb is rejected and does not touch the API', async () => {
      const { statusCode } = await injectAuthed(
        server,
        { method: 'POST', url, payload: {} },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(updatePrnStatusMock).not.toHaveBeenCalled()
    })

    test('POST redirects without calling the API when the PRN became non-editable after the page loaded', async () => {
      const formPage = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )
      const crumb = extractCrumbFromHtml(formPage.result)
      const postHeaders = mergeCookieHeaders(
        authHeaders,
        cookieHeadersFromResponse(formPage)
      )

      getPrnMock.mockResolvedValue(buildPrn({ status: 'Accepted' }))

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url,
        payload: { [CSRF_COOKIE_NAME]: crumb },
        headers: postHeaders
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `/producer/${organisationId}/prns/${prnId}?year=2026`
      )
      expect(updatePrnStatusMock).not.toHaveBeenCalled()
    })
  })

  describe('CSO PRNs list', () => {
    const url = `/cso/${schemeId}/prns?year=2026`

    test('renders the awaiting-acceptance table for the scheme', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(getOrganisationPrnsMock).toHaveBeenCalledWith(schemeId, {
        search: undefined,
        status: 'AwaitingAcceptance',
        sort: undefined,
        page: undefined,
        pageSize: undefined
      })
      expect(result).toEqual(
        expect.stringContaining('Accept or reject PRNs and PERNs')
      )
      expect(result).not.toEqual(
        expect.stringContaining('Accept or reject PRNs and PERNs for ')
      )
      expect(result).toEqual(
        expect.stringContaining(
          `href="/cso/${schemeId}/prns/${prnId}?year=2026"`
        )
      )

      vi.useRealTimers()
    })

    test('hides the accept-selected button when only multi-year December waste PRNs are listed', async () => {
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse([
          buildPrn({
            decemberWaste: true,
            obligationYear: 2026,
            issuedAt: '2026-12-20'
          })
        ])
      )

      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(expect.stringContaining('type="checkbox"'))
      expect(result).not.toEqual(
        expect.stringContaining('Accept selected PRNs and PERNs')
      )

      vi.useRealTimers()
    })

    test('POST without a selected PRN re-renders with the error summary', async () => {
      const { result, statusCode } = await injectAuthedPostForm(
        server,
        { url, payload: {} },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining(
          'To accept multiple PRNs or PERNs select one or more using the check boxes'
        )
      )
      expect(result).toEqual(expect.stringContaining('href="#selected-prns"'))
    })

    test('POST with a selected PRN re-renders without the error summary', async () => {
      const { result, statusCode } = await injectAuthedPostForm(
        server,
        { url, payload: { selectedPrnIds: prnId } },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(expect.stringContaining('There is a problem'))
    })

    test('prefixes the row view links for a reverse proxy', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))

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
          `href="${FORWARDED_PREFIX}/cso/${schemeId}/prns/${prnId}?year=2026"`
        )
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )

      vi.useRealTimers()
    })

    test('returns 403 when the user does not operate the scheme', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/cso/${unauthorisedSchemeId}/prns?year=2026`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(getOrganisationPrnsMock).not.toHaveBeenCalled()
    })
  })

  describe('CSO PRN detail', () => {
    const url = `/cso/${schemeId}/prns/${prnId}?year=2026`

    test('renders the PRN with a back link to the list', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(getPrnMock).toHaveBeenCalledWith(schemeId, prnId)
      expect(result).toEqual(
        expect.stringContaining(`href="/cso/${schemeId}/prns?year=2026"`)
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
          `href="${FORWARDED_PREFIX}/cso/${schemeId}/prns?year=2026"`
        )
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('shows the accept button linking to confirm-accept for an awaiting-acceptance PRN, prefixed for a reverse proxy', async () => {
      getPrnMock.mockResolvedValue(buildPrn({ status: 'AwaitingAcceptance' }))

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
          `href="${FORWARDED_PREFIX}/cso/${schemeId}/prns/${prnId}/confirm-accept?year=2026"`
        )
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('hides the accept button for a resolved PRN', async () => {
      getPrnMock.mockResolvedValue(buildPrn({ status: 'Accepted' }))

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(expect.stringContaining('/confirm-accept'))
    })

    test('shows the success banner for an accepted PRN', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: 2026 })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('govuk-notification-banner--success')
      )
      expect(result).toEqual(
        expect.stringContaining(
          'You accepted this PRN towards your 2026 recycling obligations'
        )
      )
      expect(result).toEqual(
        expect.stringContaining(
          'You have accepted 75 tonnes towards your 2026 recycling obligation for Plastic material.'
        )
      )
    })

    test('shows the accept-more button for a resolved PRN, prefixed for a reverse proxy', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: 2026 })
      )

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
        expect.stringContaining('Accept or reject more PRNs and PERNs for 2026')
      )
    })

    test('keeps the accept-more link on the resolved PRN year, independent of the browsed back link, when they differ', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: 2024 })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Accept or reject more PRNs and PERNs for 2024')
      )
      expect(result).toEqual(
        expect.stringContaining(`href="/cso/${schemeId}/prns?year=2024"`)
      )
      expect(result).toEqual(
        expect.stringContaining(`href="/cso/${schemeId}/prns?year=2026"`)
      )
    })

    test('shows the obligations button for a resolved PRN when manageObligations is enabled, prefixed for a reverse proxy', async () => {
      const previousManageObligationsFlag = config.get(
        'features.manageObligations'
      )
      config.set('features.manageObligations', true)
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: 2026 })
      )

      try {
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
            'View your 2026 recycling obligations progress'
          )
        )
        expect(result).toEqual(
          expect.stringContaining(
            `href="${FORWARDED_PREFIX}/cso/${schemeId}/obligations?year=2026"`
          )
        )
      } finally {
        config.set('features.manageObligations', previousManageObligationsFlag)
      }
    })

    test('hides the obligations button for a resolved PRN when manageObligations is disabled', async () => {
      const previousManageObligationsFlag = config.get(
        'features.manageObligations'
      )
      config.set('features.manageObligations', false)
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: 2026 })
      )

      try {
        const { result, statusCode } = await injectAuthed(
          server,
          { method: 'GET', url },
          authHeaders
        )

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).not.toEqual(
          expect.stringContaining(
            'View your 2026 recycling obligations progress'
          )
        )
      } finally {
        config.set('features.manageObligations', previousManageObligationsFlag)
      }
    })

    test('hides the obligations button when no year is resolved, even if manageObligations is enabled', async () => {
      const previousManageObligationsFlag = config.get(
        'features.manageObligations'
      )
      config.set('features.manageObligations', true)
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: undefined })
      )

      try {
        const { result, statusCode } = await injectAuthed(
          server,
          {
            method: 'GET',
            url: `/cso/${schemeId}/prns/${prnId}`
          },
          authHeaders
        )

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).not.toEqual(
          expect.stringContaining('recycling obligations progress')
        )
      } finally {
        config.set('features.manageObligations', previousManageObligationsFlag)
      }
    })

    test('returns 403 when the user does not operate the scheme', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/cso/${unauthorisedSchemeId}/prns/${prnId}?year=2026`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(getPrnMock).not.toHaveBeenCalled()
    })
  })

  describe('CSO PRN confirm-accept', () => {
    const url = `/cso/${schemeId}/prns/${prnId}/confirm-accept?year=2026`

    beforeEach(() => {
      getPrnMock.mockResolvedValue(buildPrn({ status: 'AwaitingAcceptance' }))
    })

    test('renders the confirmation page with GDS layout and scheme-scoped go-back link', async () => {
      const prnHref = `/cso/${schemeId}/prns/${prnId}?year=2026`
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('govuk-heading-l govuk-!-margin-bottom-7')
      )
      expect(result).toEqual(
        expect.stringContaining(
          'Are you sure you want to accept this PRN towards your 2026 recycling obligations?'
        )
      )
      expect(result).toEqual(expect.stringContaining('govuk-button-group'))
      expect(result).toEqual(expect.stringContaining('Yes, accept'))
      expect(result).toEqual(expect.stringContaining('No, go back'))
      expect(result).toEqual(expect.stringContaining(`href="${prnHref}"`))
      expect(result).not.toEqual(expect.stringContaining('app-heading'))
    })

    test('prefixes the "No, go back" link for a reverse proxy', async () => {
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
          `href="${FORWARDED_PREFIX}/cso/${schemeId}/prns/${prnId}?year=2026"`
        )
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    test('redirects to the PRN detail page when the PRN is no longer editable', async () => {
      getPrnMock.mockResolvedValue(buildPrn({ status: 'Cancelled' }))

      const { statusCode, headers } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(`/cso/${schemeId}/prns/${prnId}?year=2026`)
    })

    test('POST accepts the PRN against the scheme id and redirects to the PRN detail page', async () => {
      const { statusCode, headers } = await injectAuthedPostForm(
        server,
        { url },
        authHeaders
      )

      expect(updatePrnStatusMock).toHaveBeenCalledWith(
        schemeId,
        prnId,
        expect.objectContaining({ status: 'ACCEPTED' })
      )
      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(`/cso/${schemeId}/prns/${prnId}?year=2026`)
    })

    test('POST without a valid CSRF crumb is rejected and does not touch the API', async () => {
      const { statusCode } = await injectAuthed(
        server,
        { method: 'POST', url, payload: {} },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(updatePrnStatusMock).not.toHaveBeenCalled()
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
      ['producer PRNs list', `/producer/${organisationId}/prns?year=2026`],
      [
        'producer PRN detail',
        `/producer/${organisationId}/prns/${prnId}?year=2026`
      ],
      [
        'producer PRN confirm-accept',
        `/producer/${organisationId}/prns/${prnId}/confirm-accept?year=2026`
      ],
      ['CSO PRNs list', `/cso/${schemeId}/prns?year=2026`],
      ['CSO PRN detail', `/cso/${schemeId}/prns/${prnId}?year=2026`],
      [
        'CSO PRN confirm-accept',
        `/cso/${schemeId}/prns/${prnId}/confirm-accept?year=2026`
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

describe('prn routes when showPrns is disabled', () => {
  let server
  let authHeaders
  let previousShowPrnsFlag

  beforeAll(async () => {
    previousShowPrnsFlag = config.get('features.showPrns')
    config.set('features.showPrns', false)
    ;({ server, authHeaders } = await startAuthenticatedTestServer())
  })

  afterAll(async () => {
    await stopTestServer(server)
    config.set('features.showPrns', previousShowPrnsFlag)
  })

  test.each([
    ['producer PRNs list', `/producer/${organisationId}/prns?year=2026`],
    [
      'producer PRN detail',
      `/producer/${organisationId}/prns/${prnId}?year=2026`
    ],
    [
      'producer PRN confirm-accept',
      `/producer/${organisationId}/prns/${prnId}/confirm-accept?year=2026`
    ],
    ['CSO PRNs list', `/cso/${schemeId}/prns?year=2026`],
    ['CSO PRN detail', `/cso/${schemeId}/prns/${prnId}?year=2026`],
    [
      'CSO PRN confirm-accept',
      `/cso/${schemeId}/prns/${prnId}/confirm-accept?year=2026`
    ]
  ])('does not register the %s route', async (_label, url) => {
    const { statusCode } = await injectAuthed(
      server,
      { method: 'GET', url },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.notFound)
  })

  test.each([
    ['producer PRNs list', `/producer/${organisationId}/prns?year=2026`],
    ['CSO PRNs list', `/cso/${schemeId}/prns?year=2026`]
  ])('does not register the %s POST route', async (_label, url) => {
    const { statusCode } = await injectAuthed(
      server,
      { method: 'POST', url, payload: {} },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
