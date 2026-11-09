import { vi } from 'vitest'

import { config } from '#/config/config.js'
import { EPR_PACKAGING_BASIC_USER_SERVICE_ROLE } from '#/server/auth/constants.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { now } from '#/server/common/helpers/clock.js'
import { getComplianceYear } from '#/server/common/helpers/compliance-year.js'
import {
  authenticate,
  cookieHeadersFromResponse,
  injectAuthed,
  startAuthenticatedTestServer,
  stopTestServer
} from '#/test-helpers/auth-helper.js'
import { CSRF_COOKIE_NAME } from '#/server/plugins/crumb.js'
import { ApiError } from '#/server/services/base/api-error.js'
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

// Forces resolveSelectionAcceptanceYear to find no single year. Real selections
// cannot reach that case (the selectable filter removes it), so the full-route
// refusal test uses this to reach it.
const { noSingleAcceptanceYear } = vi.hoisted(() => ({
  noSingleAcceptanceYear: { value: false }
}))
vi.mock(
  '#/server/routes/_shared/prns/available-acceptance-years.js',
  async (importOriginal) => {
    const actual = await importOriginal()

    return {
      ...actual,
      resolveSelectionAcceptanceYear: (prns, options) =>
        noSingleAcceptanceYear.value
          ? undefined
          : actual.resolveSelectionAcceptanceYear(prns, options)
    }
  }
)

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

function buildPrnList(count) {
  return Array.from({ length: count }, (_, index) =>
    buildPrn({
      id: `d93376e3-0681-46be-aeb4-${String(index).padStart(12, '0')}`
    })
  )
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
  const updatePrnStatusesMock = vi.fn()

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
    updatePrnStatusesMock.mockReset().mockResolvedValue(null)

    server.app.wasteOrganisationsApi = { getOrganisation: getOrganisationMock }
    server.app.wasteObligationsApi = {
      getOrganisationPrns: getOrganisationPrnsMock,
      getPrn: getPrnMock,
      updatePrnStatus: updatePrnStatusMock,
      updatePrnStatuses: updatePrnStatusesMock
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
        material: undefined,
        sort: undefined,
        page: 1,
        pageSize: 100
      })
      expect(result).toEqual(
        expect.stringContaining('Accept or reject PRNs and PERNs for 2026')
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
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse(buildPrnList(21))
      )

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

      vi.useRealTimers()
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

    test('shows the December waste flash for an awaiting-acceptance PRN in the immediate flash window', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse([
          buildPrn({
            decemberWaste: true,
            issuedAt: '2026-12-05',
            accreditationYear: 2026,
            obligationYear: 2026
          })
        ])
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('flash-container--blue'))
      expect(result).toEqual(
        expect.stringContaining('december-waste-flash-row')
      )
      expect(result).toEqual(
        expect.stringContaining('Can be accepted towards 2026 or 2027')
      )

      vi.useRealTimers()
    })

    test('hides the December waste flash for a standard awaiting-acceptance PRN', async () => {
      vi.useFakeTimers()
      // Inside the window with an in-window issue date, so only the PRN not
      // being December waste can hide the flash.
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse([
          buildPrn({
            decemberWaste: false,
            issuedAt: '2026-12-05',
            accreditationYear: 2026,
            obligationYear: 2026
          })
        ])
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(
        expect.stringContaining('flash-container--blue')
      )
      expect(result).not.toEqual(
        expect.stringContaining('december-waste-flash-row')
      )

      vi.useRealTimers()
    })

    test('lists different notes for different years', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-10-16T12:00:00Z'))
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse([
          buildPrn({
            number: 'STD-2026',
            obligationYear: 2026,
            decemberWaste: false
          }),
          buildPrn({
            number: 'DEC-2026',
            obligationYear: 2026,
            decemberWaste: true,
            issuedAt: '2026-10-01'
          })
        ])
      )
      const listUrl = (year) => `/producer/${organisationId}/prns?year=${year}`

      const y2026 = await injectAuthed(
        server,
        { method: 'GET', url: listUrl(2026) },
        authHeaders
      )
      const y2027 = await injectAuthed(
        server,
        { method: 'GET', url: listUrl(2027) },
        authHeaders
      )

      expect(y2026.result).toEqual(expect.stringContaining('STD-2026'))
      expect(y2027.result).not.toEqual(expect.stringContaining('STD-2026'))
      expect(y2027.result).not.toEqual(expect.stringContaining('DEC-2026'))

      vi.useRealTimers()
    })

    test('hides the December waste flash outside the December/January window', async () => {
      vi.useFakeTimers()
      // In June the PRN still offers a choice of 2027 or 2028, so only the
      // December/January rule can hide the flash.
      vi.setSystemTime(new Date('2027-06-15T12:00:00Z'))
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse([
          buildPrn({
            decemberWaste: true,
            issuedAt: '2026-12-05',
            accreditationYear: 2026,
            obligationYear: 2027
          })
        ])
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(
        expect.stringContaining('flash-container--blue')
      )
      expect(result).not.toEqual(
        expect.stringContaining('december-waste-flash-row')
      )
      expect(result).not.toEqual(
        expect.stringContaining('Can be accepted towards')
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

    test('POST with a selected PRN redirects to the check-selection page', async () => {
      const { headers, statusCode } = await injectAuthedPostForm(
        server,
        { url, payload: { selectedPrnIds: prnId } },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `/producer/${organisationId}/prns/check-selection?year=2026`
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

    test('defaults to the current compliance year without a year query', async () => {
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
      expect(result).toEqual(
        expect.stringContaining(
          `Accept or reject PRNs and PERNs for ${getComplianceYear(now())}`
        )
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
      expect(getPrnMock).toHaveBeenCalledWith(expect.any(String), prnId)
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
      expect(getPrnMock).toHaveBeenCalledWith(expect.any(String), prnId)
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

    test('shows a red reject button linking to confirm-reject for an awaiting-acceptance PRN, prefixed for a reverse proxy', async () => {
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
      const { load } = await import('cheerio')
      const $ = load(result)
      const reject = $('a.govuk-button').filter(
        (_, element) => $(element).text().trim() === 'Reject this PRN'
      )
      expect(reject.hasClass('govuk-button--warning')).toBe(true)
      expect(reject.attr('href')).toBe(
        `${FORWARDED_PREFIX}/producer/${organisationId}/prns/${prnId}/confirm-reject?year=2026`
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
      expect(result).not.toEqual(expect.stringContaining('/confirm-reject'))
    })

    test('shows the December waste flash for an awaiting-acceptance PRN in the immediate flash window', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getPrnMock.mockResolvedValue(
        buildPrn({
          status: 'AwaitingAcceptance',
          decemberWaste: true,
          issuedAt: '2026-12-05',
          accreditationYear: 2026,
          obligationYear: 2026
        })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('flash-container--blue'))
      expect(result).toEqual(
        expect.stringContaining('Can be accepted towards 2026 or 2027')
      )

      vi.useRealTimers()
    })

    test('hides the December waste flash once the PRN has been accepted', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getPrnMock.mockResolvedValue(
        buildPrn({
          status: 'Accepted',
          decemberWaste: true,
          issuedAt: '2026-12-05',
          accreditationYear: 2026,
          obligationYear: 2026
        })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(
        expect.stringContaining('flash-container--blue')
      )

      vi.useRealTimers()
    })

    test('hides the December waste flash outside the December/January window', async () => {
      vi.useFakeTimers()
      // In June the PRN still offers a choice of 2027 or 2028, so only the
      // December/January rule can hide the flash.
      vi.setSystemTime(new Date('2027-06-15T12:00:00Z'))
      getPrnMock.mockResolvedValue(
        buildPrn({
          status: 'AwaitingAcceptance',
          decemberWaste: true,
          issuedAt: '2026-12-05',
          accreditationYear: 2026,
          obligationYear: 2027
        })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(
        expect.stringContaining('flash-container--blue')
      )
      expect(result).not.toEqual(
        expect.stringContaining('Can be accepted towards')
      )

      vi.useRealTimers()
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

    test('shows the accepted-towards-year text for an accepted PRN', async () => {
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
        expect.stringContaining('Accepted towards 2026 recycling obligations')
      )
    })

    test('omits the accepted-towards-year text for an awaiting-acceptance PRN', async () => {
      getPrnMock.mockResolvedValue(buildPrn({ status: 'AwaitingAcceptance' }))

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(expect.stringContaining('Accepted towards'))
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

  describe('PRN detail year of issue', () => {
    test('shows the year the PRN was issued for, separate from the year it was accepted into', async () => {
      getPrnMock.mockResolvedValue(
        buildPrn({
          status: 'Accepted',
          decemberWaste: true,
          accreditationYear: 2026,
          obligationYear: 2027
        })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${organisationId}/prns/${prnId}?year=2027`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Year of issue: <strong>2026</strong>')
      )
      expect(result).toEqual(
        expect.stringContaining('Accepted towards 2027 recycling obligations')
      )
    })

    test('falls back to the obligation year when the PRN has no accreditation year', async () => {
      getPrnMock.mockResolvedValue(buildPrn({ obligationYear: 2026 }))

      const { result } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${organisationId}/prns/${prnId}?year=2026`
        },
        authHeaders
      )

      expect(result).toEqual(
        expect.stringContaining('Year of issue: <strong>2026</strong>')
      )
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
        `/producer/${organisationId}/prns/${prnId}?year=2026&confirmed=1`
      )
    })

    test('POST sends the chosen obligation year when accepting a December waste PRN', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getPrnMock.mockResolvedValue(
        buildPrn({ decemberWaste: true, issuedAt: '2026-12-10' })
      )

      try {
        const { statusCode } = await injectAuthedPostForm(
          server,
          {
            url: `/producer/${organisationId}/prns/${prnId}/confirm-accept?year=2026&acceptYear=2027`
          },
          authHeaders
        )

        expect(statusCode).toBe(statusCodes.redirect)
        expect(updatePrnStatusMock).toHaveBeenCalledWith(
          organisationId,
          prnId,
          expect.objectContaining({ status: 'ACCEPTED', obligationYear: 2027 })
        )
      } finally {
        vi.useRealTimers()
      }
    })

    test('POST prefixes the post-accept redirect for a reverse proxy', async () => {
      const { statusCode, headers } = await injectAuthedPostForm(
        server,
        { url, headers: { 'x-forwarded-prefix': FORWARDED_PREFIX } },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `${FORWARDED_PREFIX}/producer/${organisationId}/prns/${prnId}?year=2026&confirmed=1`
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
        material: undefined,
        sort: undefined,
        page: 1,
        pageSize: 100
      })
      expect(result).toEqual(
        expect.stringContaining('Accept or reject PRNs and PERNs for 2026')
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

    test('shows the December waste flash for an awaiting-acceptance PRN in the immediate flash window', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse([
          buildPrn({
            decemberWaste: true,
            issuedAt: '2026-12-05',
            accreditationYear: 2026,
            obligationYear: 2026
          })
        ])
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('flash-container--blue'))
      expect(result).toEqual(
        expect.stringContaining('december-waste-flash-row')
      )
      expect(result).toEqual(
        expect.stringContaining('Can be accepted towards 2026 or 2027')
      )

      vi.useRealTimers()
    })

    test('hides the December waste flash for a standard awaiting-acceptance PRN', async () => {
      vi.useFakeTimers()
      // Inside the window with an in-window issue date, so only the PRN not
      // being December waste can hide the flash.
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse([
          buildPrn({
            decemberWaste: false,
            issuedAt: '2026-12-05',
            accreditationYear: 2026,
            obligationYear: 2026
          })
        ])
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(
        expect.stringContaining('flash-container--blue')
      )
      expect(result).not.toEqual(
        expect.stringContaining('december-waste-flash-row')
      )

      vi.useRealTimers()
    })

    test('hides the December waste flash outside the December/January window', async () => {
      vi.useFakeTimers()
      // In June the PRN still offers a choice of 2027 or 2028, so only the
      // December/January rule can hide the flash.
      vi.setSystemTime(new Date('2027-06-15T12:00:00Z'))
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse([
          buildPrn({
            decemberWaste: true,
            issuedAt: '2026-12-05',
            accreditationYear: 2026,
            obligationYear: 2027
          })
        ])
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(
        expect.stringContaining('flash-container--blue')
      )
      expect(result).not.toEqual(
        expect.stringContaining('december-waste-flash-row')
      )
      expect(result).not.toEqual(
        expect.stringContaining('Can be accepted towards')
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

    test('POST with a selected PRN redirects to the check-selection page', async () => {
      const { headers, statusCode } = await injectAuthedPostForm(
        server,
        { url, payload: { selectedPrnIds: prnId } },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `/cso/${schemeId}/prns/check-selection?year=2026`
      )
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

    test('shows a red reject button linking to confirm-reject for an awaiting-acceptance PRN, prefixed for a reverse proxy', async () => {
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
      const { load } = await import('cheerio')
      const $ = load(result)
      const reject = $('a.govuk-button').filter(
        (_, element) => $(element).text().trim() === 'Reject this PRN'
      )
      expect(reject.hasClass('govuk-button--warning')).toBe(true)
      expect(reject.attr('href')).toBe(
        `${FORWARDED_PREFIX}/cso/${schemeId}/prns/${prnId}/confirm-reject?year=2026`
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
      expect(result).not.toEqual(expect.stringContaining('/confirm-reject'))
    })

    test('shows the December waste flash for an awaiting-acceptance PRN in the immediate flash window', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getPrnMock.mockResolvedValue(
        buildPrn({
          status: 'AwaitingAcceptance',
          decemberWaste: true,
          issuedAt: '2026-12-05',
          accreditationYear: 2026,
          obligationYear: 2026
        })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('flash-container--blue'))
      expect(result).toEqual(
        expect.stringContaining('Can be accepted towards 2026 or 2027')
      )

      vi.useRealTimers()
    })

    test('hides the December waste flash once the PRN has been accepted', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getPrnMock.mockResolvedValue(
        buildPrn({
          status: 'Accepted',
          decemberWaste: true,
          issuedAt: '2026-12-05',
          accreditationYear: 2026,
          obligationYear: 2026
        })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(
        expect.stringContaining('flash-container--blue')
      )

      vi.useRealTimers()
    })

    test('hides the December waste flash outside the December/January window', async () => {
      vi.useFakeTimers()
      // In June the PRN still offers a choice of 2027 or 2028, so only the
      // December/January rule can hide the flash.
      vi.setSystemTime(new Date('2027-06-15T12:00:00Z'))
      getPrnMock.mockResolvedValue(
        buildPrn({
          status: 'AwaitingAcceptance',
          decemberWaste: true,
          issuedAt: '2026-12-05',
          accreditationYear: 2026,
          obligationYear: 2027
        })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(
        expect.stringContaining('flash-container--blue')
      )
      expect(result).not.toEqual(
        expect.stringContaining('Can be accepted towards')
      )

      vi.useRealTimers()
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

    test('shows the accepted-towards-year text for an accepted PRN', async () => {
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
        expect.stringContaining('Accepted towards 2026 recycling obligations')
      )
    })

    test('omits the accepted-towards-year text for an awaiting-acceptance PRN', async () => {
      getPrnMock.mockResolvedValue(buildPrn({ status: 'AwaitingAcceptance' }))

      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(expect.stringContaining('Accepted towards'))
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
      expect(headers.location).toBe(
        `/cso/${schemeId}/prns/${prnId}?year=2026&confirmed=1`
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
  })

  describe('producer PRN confirm-reject', () => {
    const url = `/producer/${organisationId}/prns/${prnId}/confirm-reject?year=2026`

    beforeEach(() => {
      getPrnMock.mockResolvedValue(buildPrn({ status: 'AwaitingAcceptance' }))
    })

    test('renders the confirmation page with the warning and Yes/No actions', async () => {
      const prnHref = `/producer/${organisationId}/prns/${prnId}?year=2026`
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(updatePrnStatusMock).not.toHaveBeenCalled()
      expect(result).toEqual(
        expect.stringContaining('Are you sure you want to reject this PRN? |')
      )
      expect(result).toEqual(
        expect.stringContaining('govuk-heading-l govuk-!-margin-bottom-7')
      )
      expect(result).toEqual(
        expect.stringContaining('Are you sure you want to reject this PRN?')
      )
      expect(result).toEqual(expect.stringContaining('govuk-warning-text'))
      expect(result).toEqual(
        expect.stringContaining('You will not be able to accept it later')
      )
      const { load } = await import('cheerio')
      const $ = load(result)
      const yes = $('button').filter(
        (_, element) => $(element).text().trim() === 'Yes, reject'
      )
      expect(yes.hasClass('govuk-button--warning')).toBe(true)
      expect(yes.attr('type')).toBe('submit')
      expect(yes.attr('href')).toBeUndefined()
      expect(yes.closest('form').attr('method')).toBe('post')
      const goBack = $('a.govuk-button').filter(
        (_, element) => $(element).text().trim() === 'No, go back'
      )
      expect(goBack.hasClass('govuk-button--secondary')).toBe(true)
      expect(goBack.attr('href')).toBe(prnHref)
      expect(result).toEqual(expect.stringContaining('govuk-back-link'))
      expect($('.govuk-back-link').attr('href')).toBe(prnHref)
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
      expect(result).toEqual(
        expect.stringContaining('Are you sure you want to reject this PERN?')
      )
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
      expect(updatePrnStatusMock).not.toHaveBeenCalled()
    })

    test('POST rejects the PRN with the signed-in user and redirects to the PRN detail page', async () => {
      const { statusCode, headers } = await injectAuthedPostForm(
        server,
        { url },
        authHeaders
      )

      expect(updatePrnStatusMock).toHaveBeenCalledWith(organisationId, prnId, {
        status: 'REJECTED',
        user: expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
          name: expect.any(String),
          locale: 'en'
        })
      })
      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `/producer/${organisationId}/prns/${prnId}?year=2026&confirmed=1`
      )
    })

    test('POST prefixes the post-reject redirect for a reverse proxy', async () => {
      const { statusCode, headers } = await injectAuthedPostForm(
        server,
        { url, headers: { 'x-forwarded-prefix': FORWARDED_PREFIX } },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `${FORWARDED_PREFIX}/producer/${organisationId}/prns/${prnId}?year=2026&confirmed=1`
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

    test('returns 403 when the user is not enrolled in the organisation', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/producer/${unauthorisedOrganisationId}/prns/${prnId}/confirm-reject?year=2026`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(getPrnMock).not.toHaveBeenCalled()
    })
  })

  describe('CSO PRN confirm-reject', () => {
    const url = `/cso/${schemeId}/prns/${prnId}/confirm-reject?year=2026`

    beforeEach(() => {
      getPrnMock.mockResolvedValue(buildPrn({ status: 'AwaitingAcceptance' }))
    })

    test('renders the confirmation page with a scheme-scoped go-back link', async () => {
      const prnHref = `/cso/${schemeId}/prns/${prnId}?year=2026`
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Are you sure you want to reject this PRN?')
      )
      expect(result).toEqual(
        expect.stringContaining('You will not be able to accept it later')
      )
      expect(result).toEqual(expect.stringContaining('Yes, reject'))
      expect(result).toEqual(expect.stringContaining(`href="${prnHref}"`))
      expect(result).toEqual(expect.stringContaining('No, go back'))
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

    test('POST rejects the PRN against the scheme id and redirects to the PRN detail page', async () => {
      const { statusCode, headers } = await injectAuthedPostForm(
        server,
        { url },
        authHeaders
      )

      expect(updatePrnStatusMock).toHaveBeenCalledWith(
        schemeId,
        prnId,
        expect.objectContaining({ status: 'REJECTED' })
      )
      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `/cso/${schemeId}/prns/${prnId}?year=2026&confirmed=1`
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

    test('returns 403 when the user does not operate the scheme', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/cso/${unauthorisedSchemeId}/prns/${prnId}/confirm-reject?year=2026`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(getPrnMock).not.toHaveBeenCalled()
    })
  })

  describe.each([
    { label: 'producer', prnPath: `/producer/${organisationId}/prns/${prnId}` },
    { label: 'CSO', prnPath: `/cso/${schemeId}/prns/${prnId}` }
  ])('$label accepted PRN detail', ({ prnPath }) => {
    async function getAcceptedPrn(prnOverrides = {}, query = '?year=2026') {
      const { load } = await import('cheerio')
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Accepted', obligationYear: 2026, ...prnOverrides })
      )
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: `${prnPath}${query}` },
        authHeaders
      )

      return { $: load(result), statusCode }
    }

    const textOf = (element) => element.text().replace(/\s+/g, ' ').trim()

    const bannerHeading = ($) =>
      textOf(
        $(
          '.govuk-notification-banner--success .govuk-notification-banner__heading'
        )
      )

    const bannerDescription = ($) =>
      textOf(
        $(
          '.govuk-notification-banner--success .govuk-notification-banner__heading + p'
        )
      )

    const insetLines = ($) =>
      $('.app-inset-text > .govuk-heading-m')
        .map((_, line) => textOf($(line)))
        .get()

    const buttonTexts = ($) =>
      $('.govuk-button')
        .map((_, button) => textOf($(button)))
        .get()

    test('uses PRN wording in the banner and inset for a PRN', async () => {
      const { $, statusCode } = await getAcceptedPrn()

      expect(statusCode).toBe(statusCodes.ok)
      expect(bannerHeading($)).toBe(
        'You accepted this PRN towards your 2026 recycling obligations'
      )
      expect(insetLines($)).toEqual([
        'PRN number: PRN123',
        'Year of issue: 2026',
        'Accepted towards 2026 recycling obligations'
      ])
    })

    test('uses PERN wording in the banner and inset for a PERN', async () => {
      const { $, statusCode } = await getAcceptedPrn({
        type: 'PERN',
        number: 'PERN456'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(bannerHeading($)).toBe(
        'You accepted this PERN towards your 2026 recycling obligations'
      )
      expect(insetLines($)).toEqual([
        'PERN number: PERN456',
        'Year of issue: 2026',
        'Accepted towards 2026 recycling obligations'
      ])
    })

    test('uses the singular "1 tonne" wording in the banner when the PRN is one tonne', async () => {
      const { $, statusCode } = await getAcceptedPrn({ tonnage: 1 })

      expect(statusCode).toBe(statusCodes.ok)
      expect(bannerDescription($)).toBe(
        'You have accepted 1 tonne towards your 2026 recycling obligation for Plastic material.'
      )
    })

    test('shows a green Accepted tag in the status row', async () => {
      const { $, statusCode } = await getAcceptedPrn()

      expect(statusCode).toBe(statusCodes.ok)
      const tag = $('#status .govuk-tag')
      expect(textOf(tag)).toBe('Accepted')
      expect(tag.hasClass('govuk-tag--green')).toBe(true)
    })

    test.each(['PRN', 'PERN'])(
      'removes the awaiting-acceptance controls for an accepted %s',
      async (type) => {
        const { $, statusCode } = await getAcceptedPrn({ type })

        expect(statusCode).toBe(statusCodes.ok)
        const buttons = buttonTexts($)
        expect(buttons).not.toContain(`Accept this ${type}`)
        expect(buttons).not.toContain(`Reject this ${type}`)
        expect(buttons).not.toContain(
          `Download this awaiting acceptance ${type} as a PDF`
        )
        expect(buttons).toContain(
          'Accept or reject more PRNs and PERNs for 2026'
        )
      }
    )

    test.each([
      { label: 'no year query', query: '' },
      { label: 'a different year query', query: '?year=2025' }
    ])(
      "shows the PRN's own year in the banner, inset and follow-on button with $label",
      async ({ query }) => {
        const { $, statusCode } = await getAcceptedPrn({}, query)

        expect(statusCode).toBe(statusCodes.ok)
        expect(bannerHeading($)).toBe(
          'You accepted this PRN towards your 2026 recycling obligations'
        )
        expect(bannerDescription($)).toBe(
          'You have accepted 75 tonnes towards your 2026 recycling obligation for Plastic material.'
        )
        expect(insetLines($)).toContain(
          'Accepted towards 2026 recycling obligations'
        )
        expect(buttonTexts($)).toContain(
          'Accept or reject more PRNs and PERNs for 2026'
        )
      }
    )

    test('places the PDF download at the base of the accepted view and names the file after the PRN', async () => {
      const { $, statusCode } = await getAcceptedPrn()

      expect(statusCode).toBe(statusCodes.ok)
      expect($('.notification-banner [data-prn-print]')).toHaveLength(0)
      expect($('[data-prn-print]')).toHaveLength(1)
      expect($('[data-prn-print]').attr('data-prn-number')).toBe('PRN123')
      expect(textOf($('[data-prn-print]'))).toBe('Download this PRN as a PDF')
      expect($('.prn-pdf-only').text()).toContain('Tonnage in words')
      expect($('.prn-pdf-only').text()).toContain('Seven Five')
    })

    test('places the PDF download in the green confirmation banner immediately after accept', async () => {
      const { $, statusCode } = await getAcceptedPrn(
        {},
        '?year=2026&confirmed=1'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect($('.notification-banner [data-prn-print]')).toHaveLength(1)
      expect($('[data-prn-print]')).toHaveLength(1)
      expect(textOf($('.notification-banner [data-prn-print]'))).toBe(
        'Download this PRN as a PDF'
      )
    })

    test('places the awaiting-acceptance PDF download at the base of the page', async () => {
      const { load } = await import('cheerio')
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'AwaitingAcceptance', number: 'EX2617420' })
      )
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: `${prnPath}?year=2026` },
        authHeaders
      )
      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('.notification-banner')).toHaveLength(0)
      expect($('[data-prn-print]')).toHaveLength(1)
      expect($('[data-prn-print]').attr('type')).toBe('button')
      expect($('[data-prn-print]').attr('data-prn-number')).toBe('EX2617420')
      expect(textOf($('[data-prn-print]'))).toBe(
        'Download this awaiting acceptance PRN as a PDF'
      )
    })

    test('keeps a later visit to a rejected PRN free of the confirmation banner', async () => {
      const { load } = await import('cheerio')
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Rejected', type: 'PRN', number: 'EX2617420' })
      )
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: `${prnPath}?year=2026` },
        authHeaders
      )
      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('.notification-banner')).toHaveLength(0)
      expect($('.prn-hide-in-pdf').text()).toContain(
        'The producer or compliance scheme rejected the PRN.'
      )
      expect($('.notification-banner [data-prn-print]')).toHaveLength(0)
      expect($('[data-prn-print]')).toHaveLength(1)
      expect(textOf($('[data-prn-print]'))).toBe('Download this PRN as a PDF')
      expect($('[data-prn-print]').attr('data-prn-number')).toBe('EX2617420')
      expect($('.prn-pdf-only').text()).toContain('Awaiting cancellation')
      expect($('.prn-pdf-only').text()).toContain(
        'The producer or compliance scheme rejected this prn. The reprocessor or exporter has not yet cancelled it.'
      )
      expect(textOf($('.prn-hide-in-pdf .govuk-tag'))).toBe('Rejected')
      expect($('.prn-hide-in-pdf .govuk-tag').hasClass('govuk-tag--red')).toBe(
        true
      )
      expect($('.prn-view').text()).toMatch(/December Waste\?\s*no/)
    })

    test('shows the rejection banner only immediately after rejecting', async () => {
      const { load } = await import('cheerio')
      getPrnMock.mockResolvedValue(
        buildPrn({ status: 'Rejected', type: 'PRN', number: 'EX2617420' })
      )
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: `${prnPath}?year=2026&confirmed=1` },
        authHeaders
      )
      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(bannerHeading($)).toBe('You have rejected this PRN.')
      expect(textOf($('.notification-banner [data-prn-print]'))).toBe(
        'Download this PRN as a PDF'
      )
      expect($('.notification-banner [data-prn-print]')).toHaveLength(1)
      expect($('[data-prn-print]')).toHaveLength(1)
    })

    test('shows the PERN rejection confirmation with a Rejected tag', async () => {
      const { load } = await import('cheerio')
      getPrnMock.mockResolvedValue(
        buildPrn({
          status: 'Rejected',
          type: 'PERN',
          number: 'PERN001',
          decemberWaste: true
        })
      )
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: `${prnPath}?year=2026&confirmed=1` },
        authHeaders
      )
      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(bannerHeading($)).toBe('You have rejected this PERN.')
      expect($('.prn-hide-in-pdf').text()).toContain(
        'The producer or compliance scheme rejected the PERN.'
      )
      expect(textOf($('.notification-banner [data-prn-print]'))).toBe(
        'Download this PERN as a PDF'
      )
      expect($('[data-prn-print]')).toHaveLength(1)
      expect(textOf($('.prn-hide-in-pdf .govuk-tag'))).toBe('Rejected')
      expect($('.prn-hide-in-pdf .govuk-tag').hasClass('govuk-tag--red')).toBe(
        true
      )
      expect($('.prn-pdf-only').text()).toContain('Awaiting cancellation')
      expect($('.pern-view').text()).toMatch(/December Waste\?\s*yes/)
    })

    test('shows the accepted-confirmation actions, using the CDP obligations page when it is enabled', async () => {
      const previousManageObligationsFlag = config.get(
        'features.manageObligations'
      )
      config.set('features.manageObligations', true)
      const obligationsPath = prnPath.replace(
        `/prns/${prnId}`,
        '/obligations?year=2026'
      )
      const acceptMorePath = prnPath.replace(
        `/prns/${prnId}`,
        '/prns?year=2026'
      )

      try {
        const { load } = await import('cheerio')
        getPrnMock.mockResolvedValue(
          buildPrn({ status: 'Rejected', obligationYear: 2026 })
        )
        const { result, statusCode } = await injectAuthed(
          server,
          {
            method: 'GET',
            url: `${prnPath}?year=2026`,
            headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
          },
          authHeaders
        )
        const $ = load(result)
        const button = (label) =>
          $('.govuk-button').filter(
            (_, element) => textOf($(element)) === label
          )

        expect(statusCode).toBe(statusCodes.ok)
        expect($('.notification-banner')).toHaveLength(0)
        expect(
          button('Accept or reject more PRNs and PERNs for 2026').attr('href')
        ).toBe(`${FORWARDED_PREFIX}${acceptMorePath}`)
        expect(
          button('View your 2026 recycling obligations progress').attr('class')
        ).toContain('govuk-button--secondary')
        expect(
          button('View your 2026 recycling obligations progress').attr('href')
        ).toBe(`${FORWARDED_PREFIX}${obligationsPath}`)
      } finally {
        config.set('features.manageObligations', previousManageObligationsFlag)
      }
    })

    test('links View recycling obligations to Azure when the CDP obligations page is disabled', async () => {
      const previousManageObligationsFlag = config.get(
        'features.manageObligations'
      )
      config.set('features.manageObligations', false)

      try {
        const { load } = await import('cheerio')
        getPrnMock.mockResolvedValue(
          buildPrn({ status: 'Rejected', obligationYear: 2026 })
        )
        const { result, statusCode } = await injectAuthed(
          server,
          {
            method: 'GET',
            url: `${prnPath}?year=2026`,
            headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
          },
          authHeaders
        )
        const $ = load(result)
        const obligations = $('.govuk-button').filter(
          (_, element) =>
            textOf($(element)) ===
            'View your 2026 recycling obligations progress'
        )

        expect(statusCode).toBe(statusCodes.ok)
        expect(obligations.attr('href')).toBe(
          config.get('eprPackaging.manageYourRecyclingObligationsUrl')
        )
        expect(
          getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)
        ).toEqual([])
      } finally {
        config.set('features.manageObligations', previousManageObligationsFlag)
      }
    })
  })

  describe.each([
    {
      label: 'producer',
      id: organisationId,
      listPath: `/producer/${organisationId}/prns`
    },
    { label: 'CSO', id: schemeId, listPath: `/cso/${schemeId}/prns` }
  ])('$label PRNs list sort, filter and pagination', ({ id, listPath }) => {
    // The year filter judges acceptance years against the clock
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    async function getList(query, headers = {}) {
      const { load } = await import('cheerio')
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url: `${listPath}${query}`, headers },
        authHeaders
      )

      return { $: load(result), result, statusCode }
    }

    test('renders the sort control with newest first selected by default', async () => {
      const { $, statusCode } = await getList('?year=2026')

      expect(statusCode).toBe(statusCodes.ok)
      expect($('form[data-prns-sort-filter]').attr('action')).toBe(listPath)
      expect($('form[data-prns-sort-filter]').attr('method')).toBe('get')
      expect($('label[for="sort"]').text().trim()).toBe('Sort by')
      expect($('#sort option:selected').val()).toBe('IssuedAtDescending')
      expect($('#sort option').length).toBeGreaterThan(1)
      expect($('input[name="year"]').val()).toBe('2026')
    })

    test('renders the material filter with all materials selected by default', async () => {
      const { $ } = await getList('?year=2026')

      expect($('label[for="filter"]').text().trim()).toBe('Filter by')
      expect($('select[name="material"]').attr('id')).toBe('filter')
      expect($('#filter option:selected').val()).toBe('')
      expect($('#filter option:selected').text().trim()).toBe('All materials')
      expect($('#filter option').length).toBe(8)
    })

    test('offers material as a sort option', async () => {
      const { $ } = await getList('?year=2026')
      const sortValues = $('#sort option')
        .map((_i, el) => $(el).val())
        .get()

      expect(sortValues).toContain('MaterialAscending')
      expect(sortValues).toContain('MaterialDescending')
    })

    test('sorts by material when requested', async () => {
      const { $, statusCode } = await getList(
        '?year=2026&sort=MaterialAscending'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(getOrganisationPrnsMock).toHaveBeenCalledWith(id, {
        search: undefined,
        status: 'AwaitingAcceptance',
        material: undefined,
        sort: 'MaterialAscending',
        page: 1,
        pageSize: 100
      })
      expect($('#sort option:selected').val()).toBe('MaterialAscending')
    })

    test('passes the material to the API and selects it', async () => {
      const { $, statusCode } = await getList('?year=2026&material=GlassRemelt')

      expect(statusCode).toBe(statusCodes.ok)
      expect(getOrganisationPrnsMock).toHaveBeenCalledWith(id, {
        search: undefined,
        status: 'AwaitingAcceptance',
        material: 'GlassRemelt',
        sort: undefined,
        page: 1,
        pageSize: 100
      })
      expect($('#filter option:selected').val()).toBe('GlassRemelt')
      expect($('#filter option:selected').text().trim()).toBe('Glass re-melt')
    })

    test('shows the empty table, not the no-PRNs message, when a material filter matches nothing', async () => {
      getOrganisationPrnsMock.mockResolvedValue(buildPrnsResponse([]))

      const { $, result, statusCode } = await getList(
        '?year=2026&material=GlassRemelt'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect($('table').find('th').first().text().trim()).toBe(
        'PRN or PERN number'
      )
      expect($('table tbody tr')).toHaveLength(0)
      expect(result).not.toEqual(
        expect.stringContaining(
          'You have no PRNs or PERNs awaiting acceptance.'
        )
      )
    })

    test('treats an empty material as no filter', async () => {
      const { $, statusCode } = await getList('?year=2026&material=')

      expect(statusCode).toBe(statusCodes.ok)
      expect(getOrganisationPrnsMock.mock.calls[0][1].material).toBeUndefined()
      expect($('#filter option:selected').val()).toBe('')
    })

    test('rejects an unknown material value', async () => {
      const { statusCode } = await getList('?year=2026&material=Cheese')

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(getOrganisationPrnsMock).not.toHaveBeenCalled()
    })

    test('passes the sort to the API, pages locally and selects the sort', async () => {
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse(buildPrnList(25))
      )

      const { $, statusCode } = await getList(
        '?year=2026&sort=TonnageAscending&page=2&pageSize=10'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(getOrganisationPrnsMock).toHaveBeenCalledWith(id, {
        search: undefined,
        status: 'AwaitingAcceptance',
        material: undefined,
        sort: 'TonnageAscending',
        page: 1,
        pageSize: 100
      })
      expect($('#sort option:selected').val()).toBe('TonnageAscending')
      expect(
        $('form[data-prns-sort-filter] input[name="pageSize"]').val()
      ).toBe('10')
    })

    test('the clear link resets to the list with only the year', async () => {
      const { $ } = await getList(
        '?year=2026&sort=TonnageAscending&pageSize=10'
      )

      expect($('#clearSortFilter').attr('href')).toBe(`${listPath}?year=2026`)
    })

    test('prefixes the form action and clear link for a reverse proxy', async () => {
      const { $ } = await getList('?year=2026', {
        'x-forwarded-prefix': FORWARDED_PREFIX
      })

      expect($('form[data-prns-sort-filter]').attr('action')).toBe(
        `${FORWARDED_PREFIX}${listPath}`
      )
      expect($('#clearSortFilter').attr('href')).toBe(
        `${FORWARDED_PREFIX}${listPath}?year=2026`
      )
    })

    test('rejects an unknown sort value', async () => {
      const { statusCode } = await getList('?year=2026&sort=NotASort')

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(getOrganisationPrnsMock).not.toHaveBeenCalled()
    })

    test('renders pagination that keeps the query when there is more than one page', async () => {
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse(buildPrnList(25))
      )

      const { $, statusCode } = await getList(
        '?year=2026&sort=TonnageAscending&material=Plastic&page=2&pageSize=10'
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect($('nav.govuk-pagination').length).toBe(1)
      expect($('.govuk-pagination__item').length).toBe(3)
      expect($('.govuk-pagination__item--current a').text().trim()).toBe('2')
      expect($('.govuk-pagination__item--current a').attr('aria-current')).toBe(
        'page'
      )
      expect($('.govuk-pagination__prev a').attr('href')).toBe(
        `${listPath}?year=2026&sort=TonnageAscending&material=Plastic&pageSize=10&page=1`
      )
      expect($('.govuk-pagination__next a').attr('href')).toBe(
        `${listPath}?year=2026&sort=TonnageAscending&material=Plastic&pageSize=10&page=3`
      )
      expect($('.govuk-pagination__prev').text()).toContain('Previous')
      expect($('.govuk-pagination__next').text()).toContain('Next')
    })

    test('omits previous on the first page and next on the last page', async () => {
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse(buildPrnList(25))
      )
      const first = await getList('?year=2026&pageSize=10')

      expect(first.$('.govuk-pagination__prev').length).toBe(0)
      expect(first.$('.govuk-pagination__next').length).toBe(1)

      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse(buildPrnList(25))
      )
      const last = await getList('?year=2026&page=3&pageSize=10')

      expect(last.$('.govuk-pagination__prev').length).toBe(1)
      expect(last.$('.govuk-pagination__next').length).toBe(0)
    })

    test('prefixes pagination links for a reverse proxy', async () => {
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse(buildPrnList(25))
      )

      const { $ } = await getList('?year=2026&pageSize=10', {
        'x-forwarded-prefix': FORWARDED_PREFIX
      })

      expect($('.govuk-pagination__next a').attr('href')).toBe(
        `${FORWARDED_PREFIX}${listPath}?year=2026&pageSize=10&page=2`
      )
    })

    test('omits pagination when everything fits on one page', async () => {
      getOrganisationPrnsMock.mockResolvedValue({
        prns: [buildPrn()],
        total: 1,
        page: 1,
        pageSize: 20
      })

      const { $ } = await getList('?year=2026')

      expect($('nav.govuk-pagination').length).toBe(0)
    })

    test('redirects to the last valid page when a bookmarked page is empty but PRNs still exist', async () => {
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse(buildPrnList(20))
      )

      const { statusCode, headers } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `${listPath}?year=2026&page=3&pageSize=10`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(`${listPath}?year=2026&pageSize=10&page=2`)
    })

    test('prefixes the out-of-range page redirect for a reverse proxy', async () => {
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse(buildPrnList(20))
      )

      const { statusCode, headers } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `${listPath}?year=2026&page=3&pageSize=10`,
          headers: { 'x-forwarded-prefix': FORWARDED_PREFIX }
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `${FORWARDED_PREFIX}${listPath}?year=2026&pageSize=10&page=2`
      )
    })

    test('shows the no-PRNs message, not a redirect, when the list is genuinely empty', async () => {
      getOrganisationPrnsMock.mockResolvedValue(buildPrnsResponse([]))

      const { result, statusCode } = await getList('?year=2026')

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          'You have no PRNs or PERNs awaiting acceptance.'
        )
      )
    })
  })

  describe.each([
    {
      label: 'producer',
      basePath: `/producer/${organisationId}/prns`
    },
    { label: 'CSO', basePath: `/cso/${schemeId}/prns` }
  ])('$label PRNs check selection', ({ basePath }) => {
    const listUrl = `${basePath}?year=2026`
    const checkSelectionUrl = `${basePath}/check-selection?year=2026`
    const steelPrnId = 'a1b2c3d4-0681-46be-aeb4-7450a2e784d8'
    const secondPlasticPrnId = 'c1b2c3d4-0681-46be-aeb4-7450a2e784d8'
    const prnsById = {
      [prnId]: buildPrn(),
      [secondPlasticPrnId]: buildPrn({
        id: secondPlasticPrnId,
        number: 'PRN789',
        tonnage: 25,
        issuedAt: '2026-05-20',
        issuer: { organisationName: 'Other Reprocessor Ltd' }
      }),
      [steelPrnId]: buildPrn({
        id: steelPrnId,
        number: 'PERN456',
        type: 'PERN',
        material: 'Steel',
        tonnage: 40
      })
    }

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-06-01T12:00:00Z'))
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse(Object.values(prnsById))
      )
      // Each selected PRN is read again from the backend, as it is now.
      getPrnMock.mockImplementation(async (_organisationId, id) => {
        if (!prnsById[id]) {
          throw ApiError.from({
            message: 'not found',
            status: statusCodes.notFound
          })
        }

        return prnsById[id]
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    async function selectPrns(selectedPrnIds, headers, url = listUrl) {
      const response = await injectAuthedPostForm(
        server,
        { url, payload: { selectedPrnIds }, headers },
        authHeaders
      )

      return {
        response,
        sessionHeaders: mergeCookieHeaders(
          cookieHeadersFromResponse(response),
          authHeaders
        )
      }
    }

    test('lists the selected PRNs in one table per material with totals', async () => {
      const { sessionHeaders } = await selectPrns([
        steelPrnId,
        prnId,
        secondPlasticPrnId
      ])

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: checkSelectionUrl,
        headers: sessionHeaders
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Check your selection before accepting')

      const tables = result
        .split('data-testid="check-selection-table"')
        .slice(1)
      expect(tables).toHaveLength(2)

      expect(tables[0]).toContain('Plastic')
      expect(tables[0]).toContain('PRN123')
      expect(tables[0]).toContain('02 Apr 2026')
      expect(tables[0]).toContain('Reprocessor Ltd')
      expect(tables[0]).toContain('PRN789')
      expect(tables[0]).toContain('20 May 2026')
      expect(tables[0]).toContain('Other Reprocessor Ltd')
      expect(tables[0]).toMatch(
        /data-testid="material-total-tonnage"[^>]*>\s*100\s*</
      )
      expect(tables[0]).not.toContain('PERN456')

      expect(tables[1]).toContain('Steel')
      expect(tables[1]).toContain('PERN456')
      expect(tables[1]).toMatch(
        /data-testid="material-total-tonnage"[^>]*>\s*40\s*</
      )

      expect(result).toContain(`href="${basePath}/${prnId}?year=2026"`)
      expect(result).toContain(`href="${basePath}/${steelPrnId}?year=2026"`)
      expect(result).toContain('Remove from selection')
      expect(result).toContain('id="csrf-crumb"')
      expect(result).toContain('Go back')
      expect(result).toContain(`href="${listUrl}"`)
      expect(result).toMatch(
        /<button value="true" type="submit" name="accept"[^>]*data-testid="accept-selected-prns"/
      )
      expect(result).not.toMatch(
        /<button[^>]*disabled[^>]*data-testid="accept-selected-prns"/
      )
      // The review page shows the selection as the list cached it, so it reads
      // nothing from the backend; accepting re-reads each PRN before sending.
      expect(getPrnMock).not.toHaveBeenCalled()
    })

    test('prefixes page links for a reverse proxy', async () => {
      const proxyHeaders = { 'x-forwarded-prefix': FORWARDED_PREFIX }
      const { response, sessionHeaders } = await selectPrns(
        [prnId],
        proxyHeaders
      )

      expect(response.headers.location).toBe(
        `${FORWARDED_PREFIX}${checkSelectionUrl}`
      )

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: checkSelectionUrl,
        headers: { ...sessionHeaders, ...proxyHeaders }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain(
        `href="${FORWARDED_PREFIX}${basePath}/${prnId}?year=2026"`
      )
      expect(getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)).toEqual(
        []
      )
    })

    // GETs the check-selection page for its crumb and cookies, then POSTs.
    async function postCheckSelection(
      sessionHeaders,
      payload,
      extraHeaders,
      url = checkSelectionUrl
    ) {
      const page = await server.inject({
        method: 'GET',
        url,
        headers: { ...sessionHeaders, ...extraHeaders }
      })
      const headers = mergeCookieHeaders(
        cookieHeadersFromResponse(page),
        sessionHeaders
      )
      const response = await server.inject({
        method: 'POST',
        url,
        payload: {
          ...payload,
          [config.get('csrf.cookie.name')]: extractCrumbFromHtml(page.result)
        },
        headers: { ...headers, ...extraHeaders }
      })

      return {
        response,
        headers: mergeCookieHeaders(
          cookieHeadersFromResponse(response),
          headers
        )
      }
    }

    test('accepts every selected PRN in one request and shows the confirmation', async () => {
      const { sessionHeaders } = await selectPrns([steelPrnId, prnId])

      const { response, headers } = await postCheckSelection(sessionHeaders, {
        accept: 'true'
      })

      expect(response.statusCode).toBe(statusCodes.redirect)
      expect(response.headers.location).toBe(
        `${basePath}/accepted-selection?year=2026`
      )
      expect(updatePrnStatusesMock).toHaveBeenCalledTimes(1)
      const [complianceOrganisationId, payload] =
        updatePrnStatusesMock.mock.calls[0]
      expect(basePath).toContain(complianceOrganisationId)
      expect(payload).toEqual({
        status: 'ACCEPTED',
        prnIds: [steelPrnId, prnId],
        obligationYear: 2026,
        user: expect.objectContaining({ locale: 'en' })
      })

      const confirmation = await server.inject({
        method: 'GET',
        url: `${basePath}/accepted-selection?year=2026`,
        headers
      })

      expect(confirmation.statusCode).toBe(statusCodes.ok)
      expect(confirmation.result).toContain(
        'You’ve accepted 2 PRNs and PERNs towards your 2026 recycling obligations'
      )
      const tiles = confirmation.result
        .split('data-testid="accepted-selection-tiles"')[1]
        .split('</ul>')[0]
      expect(tiles).toMatch(
        /75 tonnes<\/p>\s*<p[^>]*>accepted towards your recycling obligation for plastic</
      )
      expect(tiles).toMatch(
        /40 tonnes<\/p>\s*<p[^>]*>accepted towards your recycling obligation for steel</
      )
      // AC4: CDP has no search page yet, so this goes to the Azure one,
      // unfiltered.
      expect(confirmation.result).toMatch(
        new RegExp(
          `<a class="govuk-link" href="${config.get('eprPackaging.homeUrl')}/view-awaiting-acceptance">\\s*Search PRNs and PERNs\\s*</a>`
        )
      )

      // The language switcher reloads the same page with ?lang=cy, so the
      // confirmation must survive a second render.
      const confirmationHeaders = mergeCookieHeaders(
        cookieHeadersFromResponse(confirmation),
        headers
      )
      const inWelsh = await server.inject({
        method: 'GET',
        url: `${basePath}/accepted-selection?year=2026&lang=cy`,
        headers: confirmationHeaders
      })

      expect(inWelsh.statusCode).toBe(statusCodes.ok)
      expect(inWelsh.result).toContain('data-testid="accepted-selection-tiles"')
      expect(inWelsh.result).toContain('<html lang="cy"')

      // Opening the PRNs list starts afresh and clears the confirmation.
      const list = await server.inject({
        method: 'GET',
        url: listUrl,
        headers: mergeCookieHeaders(
          cookieHeadersFromResponse(inWelsh),
          confirmationHeaders
        )
      })
      const afterList = await server.inject({
        method: 'GET',
        url: `${basePath}/accepted-selection?year=2026`,
        headers: mergeCookieHeaders(
          cookieHeadersFromResponse(list),
          confirmationHeaders
        )
      })

      expect(afterList.statusCode).toBe(statusCodes.redirect)
      expect(afterList.headers.location).toBe(listUrl)

      const checkAgain = await server.inject({
        method: 'GET',
        url: checkSelectionUrl,
        headers
      })

      expect(checkAgain.statusCode).toBe(statusCodes.redirect)
    })

    test('a tile for a PRN with no recognised material leaves the material out', async () => {
      const unrecognised = buildPrn({ material: undefined, tonnage: 12 })
      getOrganisationPrnsMock.mockResolvedValue(
        buildPrnsResponse([unrecognised])
      )
      getPrnMock.mockResolvedValue(unrecognised)
      const { sessionHeaders } = await selectPrns([prnId])
      const { headers } = await postCheckSelection(sessionHeaders, {
        accept: 'true'
      })

      const { result } = await server.inject({
        method: 'GET',
        url: `${basePath}/accepted-selection?year=2026`,
        headers
      })

      const tiles = result
        .split('data-testid="accepted-selection-tiles"')[1]
        .split('</ul>')[0]
      expect(tiles).toMatch(
        /12 tonnes<\/p>\s*<p[^>]*>accepted towards your recycling obligation<\/p>/
      )
      expect(tiles).not.toContain('not provided')
    })

    test('confirms a single accepted PRN with singular wording', async () => {
      const { sessionHeaders } = await selectPrns([prnId])
      const { headers } = await postCheckSelection(sessionHeaders, {
        accept: 'true'
      })

      const { result } = await server.inject({
        method: 'GET',
        url: `${basePath}/accepted-selection?year=2026`,
        headers
      })

      expect(result).toContain(
        'You’ve accepted 1 PRN or PERN towards your 2026 recycling obligations'
      )
    })

    test('prefixes the accepted-selection links for a reverse proxy', async () => {
      const previousManageObligations = config.get('features.manageObligations')
      config.set('features.manageObligations', true)

      try {
        const proxyHeaders = { 'x-forwarded-prefix': FORWARDED_PREFIX }
        const { sessionHeaders } = await selectPrns([prnId], proxyHeaders)
        const { response, headers } = await postCheckSelection(
          sessionHeaders,
          { accept: 'true' },
          proxyHeaders
        )

        expect(response.headers.location).toBe(
          `${FORWARDED_PREFIX}${basePath}/accepted-selection?year=2026`
        )

        const { result } = await server.inject({
          method: 'GET',
          url: `${basePath}/accepted-selection?year=2026`,
          headers: { ...headers, ...proxyHeaders }
        })

        expect(result).toContain(
          `href="${FORWARDED_PREFIX}${basePath.replace(/\/prns$/, '/obligations')}?year=2026"`
        )
        expect(
          getNonPrefixedServiceLinkHrefs(result, FORWARDED_PREFIX)
        ).toEqual([])
      } finally {
        config.set('features.manageObligations', previousManageObligations)
      }
    })

    // The list and check-selection pages can be reached without ?year. The
    // confirmation must still show the year the PRNs were accepted into, which
    // it takes from the accepted PRNs rather than the query.
    test('shows the acceptance year when the list was opened without ?year', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
      const previousManageObligations = config.get('features.manageObligations')
      config.set('features.manageObligations', true)

      try {
        const { sessionHeaders } = await selectPrns([prnId], {}, basePath)
        const { response, headers } = await postCheckSelection(
          sessionHeaders,
          { accept: 'true' },
          {},
          `${basePath}/check-selection`
        )

        expect(response.statusCode).toBe(statusCodes.redirect)
        expect(response.headers.location).toBe(
          `${basePath}/accepted-selection?year=2026`
        )

        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: `${basePath}/accepted-selection`,
          headers
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toContain(
          'You’ve accepted 1 PRN or PERN towards your 2026 recycling obligations'
        )
        expect(result).toContain(
          'View your 2026 recycling obligations progress'
        )
        expect(result).toContain(
          `href="${basePath.replace(/\/prns$/, '/obligations')}?year=2026"`
        )
      } finally {
        config.set('features.manageObligations', previousManageObligations)
        vi.useRealTimers()
      }
    })

    test('carries the list sort and filter through accepting to the confirmation and back', async () => {
      const sortedListUrl = `${basePath}?year=2026&sort=TonnageDescending&material=Plastic`
      const response = await injectAuthedPostForm(
        server,
        { url: sortedListUrl, payload: { selectedPrnIds: [prnId] } },
        authHeaders
      )
      const sessionHeaders = mergeCookieHeaders(
        cookieHeadersFromResponse(response),
        authHeaders
      )

      const { response: accept, headers } = await postCheckSelection(
        sessionHeaders,
        { accept: 'true' }
      )
      const acceptedUrl = `${basePath}/accepted-selection?year=2026&sort=TonnageDescending&material=Plastic`

      expect(accept.headers.location).toBe(acceptedUrl)

      const confirmation = await server.inject({
        method: 'GET',
        url: acceptedUrl,
        headers
      })
      expect(confirmation.statusCode).toBe(statusCodes.ok)

      const confirmationHeaders = mergeCookieHeaders(
        cookieHeadersFromResponse(confirmation),
        headers
      )
      const list = await server.inject({
        method: 'GET',
        url: sortedListUrl,
        headers: confirmationHeaders
      })
      const afterList = await server.inject({
        method: 'GET',
        url: acceptedUrl,
        headers: mergeCookieHeaders(
          cookieHeadersFromResponse(list),
          confirmationHeaders
        )
      })

      expect(afterList.headers.location).toBe(sortedListUrl)
    })

    test('the confirmation redirects to the list when nothing was accepted', async () => {
      const { statusCode, headers } = await injectAuthed(
        server,
        { method: 'GET', url: `${basePath}/accepted-selection?year=2026` },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(listUrl)
    })

    test('shows the not found page when a selected PRN no longer exists', async () => {
      updatePrnStatusesMock.mockRejectedValue(
        ApiError.from({ message: 'not found', status: statusCodes.notFound })
      )
      const { sessionHeaders } = await selectPrns([steelPrnId, prnId])

      const { response, headers } = await postCheckSelection(sessionHeaders, {
        accept: 'true'
      })

      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(response.result).not.toContain(
        'Check your selection before accepting'
      )

      const page = await server.inject({
        method: 'GET',
        url: checkSelectionUrl,
        headers
      })

      expect(page.statusCode).toBe(statusCodes.redirect)
      expect(page.headers.location).toBe(listUrl)
    })

    test.each([
      ['conflict', statusCodes.conflict],
      ['gone', statusCodes.gone],
      ['unprocessable', statusCodes.unprocessableEntity]
    ])(
      'shows the service error page and clears the selection when the bulk accept reports a %s',
      async (_name, status) => {
        updatePrnStatusesMock.mockRejectedValue(
          ApiError.from({ message: 'changed', status })
        )
        const { sessionHeaders } = await selectPrns([steelPrnId, prnId])

        const { response, headers } = await postCheckSelection(sessionHeaders, {
          accept: 'true'
        })

        expect(response.statusCode).toBe(statusCodes.internalServerError)
        expect(updatePrnStatusesMock).toHaveBeenCalledTimes(1)

        const page = await server.inject({
          method: 'GET',
          url: checkSelectionUrl,
          headers
        })

        expect(page.statusCode).toBe(statusCodes.redirect)
        expect(page.headers.location).toBe(listUrl)
      }
    )

    test('shows the service error page when the bulk accept fails', async () => {
      updatePrnStatusesMock.mockRejectedValue(
        ApiError.from({ message: 'boom', status: 500 })
      )
      const { sessionHeaders } = await selectPrns([prnId])

      const { response } = await postCheckSelection(sessionHeaders, {
        accept: 'true'
      })

      expect(response.statusCode).toBe(statusCodes.internalServerError)
    })

    test('removes a PRN from the selection', async () => {
      const { sessionHeaders } = await selectPrns([prnId, steelPrnId])
      const page = await server.inject({
        method: 'GET',
        url: checkSelectionUrl,
        headers: sessionHeaders
      })
      const headers = mergeCookieHeaders(
        cookieHeadersFromResponse(page),
        sessionHeaders
      )

      const removeResponse = await server.inject({
        method: 'POST',
        url: checkSelectionUrl,
        payload: {
          removePrnId: steelPrnId,
          [config.get('csrf.cookie.name')]: extractCrumbFromHtml(page.result)
        },
        headers
      })

      expect(removeResponse.statusCode).toBe(statusCodes.redirect)
      expect(removeResponse.headers.location).toBe(checkSelectionUrl)

      const { result } = await server.inject({
        method: 'GET',
        url: checkSelectionUrl,
        headers: mergeCookieHeaders(
          cookieHeadersFromResponse(removeResponse),
          headers
        )
      })

      expect(result).toContain('PRN123')
      expect(result).not.toContain('PERN456')
    })

    test('going back clears the stored selection', async () => {
      const { sessionHeaders } = await selectPrns([prnId, steelPrnId])
      const page = await server.inject({
        method: 'GET',
        url: checkSelectionUrl,
        headers: sessionHeaders
      })
      const headers = mergeCookieHeaders(
        cookieHeadersFromResponse(page),
        sessionHeaders
      )

      const goBackResponse = await server.inject({
        method: 'POST',
        url: checkSelectionUrl,
        payload: {
          goBack: 'true',
          [config.get('csrf.cookie.name')]: extractCrumbFromHtml(page.result)
        },
        headers
      })

      expect(goBackResponse.statusCode).toBe(statusCodes.redirect)
      expect(goBackResponse.headers.location).toBe(listUrl)

      const { statusCode, headers: afterGoBackHeaders } = await server.inject({
        method: 'GET',
        url: checkSelectionUrl,
        headers: mergeCookieHeaders(
          cookieHeadersFromResponse(goBackResponse),
          headers
        )
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(afterGoBackHeaders.location).toBe(listUrl)
    })

    test('POST accept without a valid CSRF crumb is rejected and sends nothing', async () => {
      const { sessionHeaders } = await selectPrns([prnId])

      const { statusCode } = await server.inject({
        method: 'POST',
        url: checkSelectionUrl,
        payload: { accept: 'true' },
        headers: sessionHeaders
      })

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(updatePrnStatusesMock).not.toHaveBeenCalled()
    })

    test('POST accept with a wrong CSRF crumb is rejected and sends nothing', async () => {
      const { sessionHeaders } = await selectPrns([prnId])

      const { statusCode } = await server.inject({
        method: 'POST',
        url: checkSelectionUrl,
        payload: { accept: 'true', [CSRF_COOKIE_NAME]: 'not-the-crumb' },
        headers: sessionHeaders
      })

      expect(statusCode).toBe(statusCodes.forbidden)
      expect(updatePrnStatusesMock).not.toHaveBeenCalled()
    })

    test('refuses an accept with a bad request, sending nothing, when no single acceptance year applies', async () => {
      const { sessionHeaders } = await selectPrns([steelPrnId, prnId])
      noSingleAcceptanceYear.value = true

      try {
        const { response } = await postCheckSelection(sessionHeaders, {
          accept: 'true'
        })

        expect(response.statusCode).toBe(statusCodes.badRequest)
        expect(updatePrnStatusesMock).not.toHaveBeenCalled()
      } finally {
        noSingleAcceptanceYear.value = false
      }
    })

    test('the confirmation has one h1 and its tiles list has an accessible name', async () => {
      const { sessionHeaders } = await selectPrns([steelPrnId, prnId])
      const { headers } = await postCheckSelection(sessionHeaders, {
        accept: 'true'
      })

      const confirmation = await server.inject({
        method: 'GET',
        url: `${basePath}/accepted-selection?year=2026`,
        headers
      })

      expect(confirmation.result.match(/<h1[\s>]/g)).toHaveLength(1)
      expect(confirmation.result).toMatch(
        /<h1[^>]*>\s*You’ve accepted 2 PRNs and PERNs/
      )
      const tilesTag = confirmation.result.match(
        /<ul[^>]*data-testid="accepted-selection-tiles"[^>]*>/
      )[0]
      expect(tilesTag).toContain('aria-label="Accepted tonnage by material"')
    })

    test('POST to remove without a valid CSRF crumb is rejected', async () => {
      const { statusCode } = await injectAuthed(
        server,
        {
          method: 'POST',
          url: checkSelectionUrl,
          payload: { removePrnId: prnId }
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.forbidden)
    })

    test('redirects to the list when nothing is selected', async () => {
      const { statusCode, headers } = await injectAuthed(
        server,
        { method: 'GET', url: checkSelectionUrl },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(listUrl)
      expect(getPrnMock).not.toHaveBeenCalled()
    })

    test('does not send an accept again when the backend shows the PRN accepted for the same year', async () => {
      const { sessionHeaders } = await selectPrns([prnId])
      getPrnMock.mockResolvedValue(buildPrn({ status: 'Accepted' }))

      const { response } = await postCheckSelection(sessionHeaders, {
        accept: 'true'
      })

      expect(updatePrnStatusesMock).not.toHaveBeenCalled()
      expect(response.statusCode).toBe(statusCodes.redirect)
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
      [
        'producer PRN confirm-reject',
        `/producer/${organisationId}/prns/${prnId}/confirm-reject?year=2026`
      ],
      ['CSO PRNs list', `/cso/${schemeId}/prns?year=2026`],
      ['CSO PRN detail', `/cso/${schemeId}/prns/${prnId}?year=2026`],
      [
        'CSO PRN confirm-accept',
        `/cso/${schemeId}/prns/${prnId}/confirm-accept?year=2026`
      ],
      [
        'CSO PRN confirm-reject',
        `/cso/${schemeId}/prns/${prnId}/confirm-reject?year=2026`
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
  describe('producer PRN choose-year', () => {
    const url = `/producer/${organisationId}/prns/${prnId}/choose-year?year=2026`

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getPrnMock.mockResolvedValue(
        buildPrn({ decemberWaste: true, issuedAt: '2026-12-10' })
      )
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('renders the year radios for a December waste PRN', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          'Which year’s recycling obligations do you want to accept this PRN towards?'
        )
      )
      expect(result).toEqual(
        expect.stringContaining('Choose which year to accept this PRN into |')
      )
      expect(result).toEqual(expect.stringContaining('value="2026"'))
      expect(result).toEqual(expect.stringContaining('value="2027"'))
      expect(result).toEqual(expect.stringContaining('Continue'))
    })

    test('POST without a selection re-renders with an error', async () => {
      const { result, statusCode } = await injectAuthedPostForm(
        server,
        { url, payload: {} },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining(
          'Error: Choose which year to accept this PRN into'
        )
      )
      expect(result).toEqual(
        expect.stringContaining('Select the year to accept into')
      )
      expect(result).toEqual(expect.stringContaining('href="#acceptYear"'))
    })

    test('POST with a year redirects to the confirmation page with that year', async () => {
      const { headers, statusCode } = await injectAuthedPostForm(
        server,
        { url, payload: { acceptYear: '2027' } },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `/producer/${organisationId}/prns/${prnId}/confirm-accept?year=2026&acceptYear=2027`
      )
    })
  })

  describe('CSO PRN choose-year', () => {
    const url = `/cso/${schemeId}/prns/${prnId}/choose-year?year=2026`

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
      getPrnMock.mockResolvedValue(
        buildPrn({ decemberWaste: true, issuedAt: '2026-12-10' })
      )
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('renders the year radios for a December waste PRN', async () => {
      const { result, statusCode } = await injectAuthed(
        server,
        { method: 'GET', url },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          'Which year’s recycling obligations do you want to accept this PRN towards?'
        )
      )
      expect(result).toEqual(expect.stringContaining('value="2026"'))
      expect(result).toEqual(expect.stringContaining('value="2027"'))
      expect(result).toEqual(expect.stringContaining('Continue'))
    })

    test('POST without a selection re-renders with an error', async () => {
      const { result, statusCode } = await injectAuthedPostForm(
        server,
        { url, payload: {} },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining('Select the year to accept into')
      )
      expect(result).toEqual(expect.stringContaining('href="#acceptYear"'))
    })

    test('POST with a year redirects to the confirmation page with that year', async () => {
      const { headers, statusCode } = await injectAuthedPostForm(
        server,
        { url, payload: { acceptYear: '2027' } },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(
        `/cso/${schemeId}/prns/${prnId}/confirm-accept?year=2026&acceptYear=2027`
      )
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
    [
      'producer PRN confirm-reject',
      `/producer/${organisationId}/prns/${prnId}/confirm-reject?year=2026`
    ],
    ['CSO PRNs list', `/cso/${schemeId}/prns?year=2026`],
    ['CSO PRN detail', `/cso/${schemeId}/prns/${prnId}?year=2026`],
    [
      'CSO PRN confirm-accept',
      `/cso/${schemeId}/prns/${prnId}/confirm-accept?year=2026`
    ],
    [
      'CSO PRN confirm-reject',
      `/cso/${schemeId}/prns/${prnId}/confirm-reject?year=2026`
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
    [
      'producer PRN confirm-reject',
      `/producer/${organisationId}/prns/${prnId}/confirm-reject?year=2026`
    ],
    ['CSO PRNs list', `/cso/${schemeId}/prns?year=2026`],
    [
      'CSO PRN confirm-reject',
      `/cso/${schemeId}/prns/${prnId}/confirm-reject?year=2026`
    ]
  ])('does not register the %s POST route', async (_label, url) => {
    const { statusCode } = await injectAuthed(
      server,
      { method: 'POST', url, payload: {} },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
