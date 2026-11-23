import { vi } from 'vitest'
import { load } from 'cheerio'

import { config } from '#/config/config.js'
import { mergeCookieHeaders } from '#/test-helpers/csrf-helper.js'
import { ApiError } from '#/server/services/base/api-error.js'
import { MOCK_AUTH_ORGANISATION_ID } from '#/test-helpers/auth-test-constants.js'
import {
  authenticate,
  cookieHeadersFromResponse,
  injectAuthed,
  startAuthenticatedTestServer,
  stopTestServer
} from '#/test-helpers/auth-helper.js'

const organisationId = MOCK_AUTH_ORGANISATION_ID
const prnId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'
const listUrl = `/producer/${organisationId}/prns?year=2026`
const prnUrl = `/producer/${organisationId}/prns/${prnId}?year=2026`

const prn = {
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
  reprocessingSite: 'Reprocessing Site A'
}

describe('back link when a page is opened in a new tab', () => {
  let server
  let authHeaders
  let previousShowPrnsFlag

  beforeAll(async () => {
    previousShowPrnsFlag = config.get('features.showPrns')
    config.set('features.showPrns', true)
    ;({ server, authHeaders } = await startAuthenticatedTestServer())
    server.app.wasteOrganisationsApi = {
      getOrganisation: vi
        .fn()
        .mockResolvedValue({ id: organisationId, name: 'Example Operator Ltd' })
    }
    server.app.wasteObligationsApi = {
      getOrganisationPrns: vi
        .fn()
        .mockResolvedValue({ prns: [prn], total: 1, page: 1, pageSize: 20 }),
      getPrn: vi.fn().mockResolvedValue(prn)
    }
  })

  afterAll(async () => {
    await stopTestServer(server)
    config.set('features.showPrns', previousShowPrnsFlag)
  })

  function backLinkHref(result) {
    return load(result)('a.govuk-back-link').attr('href')
  }

  // Like a browser, keep the session cookie each response sets for the next request.
  function browser(initialHeaders) {
    let headers = initialHeaders

    return async (url) => {
      const response = await injectAuthed(
        server,
        { method: 'GET', url },
        headers
      )
      // The newest cookies come first: the merge keeps the first of each name.
      headers = mergeCookieHeaders(cookieHeadersFromResponse(response), headers)

      return response
    }
  }

  test('opens the previous page in the journey, with no Referer header', async () => {
    const visit = browser(authHeaders)

    // One session visits a PRN, then the list.
    await visit(prnUrl)
    await visit(listUrl)

    // A new tab shares the session cookie but sends no Referer.
    const { result } = await visit(listUrl)

    expect(backLinkHref(result)).toBe(prnUrl)
  })

  test('falls back to home when the session has no earlier page', async () => {
    const { result } = await browser(await authenticate(server))(listUrl)

    expect(backLinkHref(result)).toBe(config.get('eprPackaging.homeUrl'))
  })

  test('shows the not found page without a back link for an unknown PRN', async () => {
    server.app.wasteObligationsApi.getPrn.mockRejectedValueOnce(
      new ApiError({ status: 404, title: 'Not Found' })
    )

    const { result, statusCode } = await browser(authHeaders)(prnUrl)
    const $ = load(result)

    expect(statusCode).toBe(404)
    expect($('a.govuk-back-link')).toHaveLength(0)
    expect($('.language-toggle')).toHaveLength(1)
  })
})
