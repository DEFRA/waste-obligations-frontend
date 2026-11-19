import { load } from 'cheerio'
import { vi } from 'vitest'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { ApiError } from '#/server/services/base/api-error.js'
import {
  injectAuthed,
  startAuthenticatedTestServer,
  stopTestServer
} from '#/test-helpers/auth-helper.js'
import { MOCK_AUTH_ORGANISATION_ID } from '#/test-helpers/auth-test-constants.js'
import { MOCK_COMPLIANCE_SCHEME_ID } from '#/test-helpers/mock-backend-account-api.js'

const organisationId = MOCK_AUTH_ORGANISATION_ID
const schemeId = MOCK_COMPLIANCE_SCHEME_ID
const prnId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'
const year = 2026

const prn = {
  id: prnId,
  number: 'PRN123',
  type: 'PRN',
  status: 'AwaitingAcceptance',
  material: 'Plastic',
  tonnage: 75,
  obligationYear: year,
  decemberWaste: true,
  issuedAt: '2026-12-10',
  issuer: { organisationName: 'Reprocessor Ltd' },
  authorisedBy: { name: 'Jane Doe', position: 'Director' },
  accreditationNumber: 'AN-123',
  reprocessingSite: 'Reprocessing Site A',
  additionalNotes: 'Ref 345678F'
}

const obligationsResponse = {
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

const serverErrors = [
  ['500', () => new ApiError({ status: 500 })],
  ['502', () => new ApiError({ status: 502 })],
  ['503', () => new ApiError({ status: 503 })],
  ['504', () => new ApiError({ status: 504 })],
  [
    'timeout',
    () =>
      Object.assign(new Error('The operation timed out'), {
        name: 'TimeoutError'
      })
  ]
]

// Each page, with the API reads it needs to render.
const pages = [
  [
    'accept or reject list',
    (id) => `/producer/${id}/prns`,
    'organisation',
    'getOrganisationPrns'
  ],
  [
    'PRN page',
    (id) => `/producer/${id}/prns/${prnId}`,
    'organisation',
    'getPrn'
  ],
  [
    'choose year to accept',
    (id) => `/producer/${id}/prns/${prnId}/choose-year`,
    'getPrn'
  ],
  [
    'confirm accept',
    (id) => `/producer/${id}/prns/${prnId}/confirm-accept?acceptYear=2026`,
    'getPrn'
  ],
  [
    'confirm reject',
    (id) => `/producer/${id}/prns/${prnId}/confirm-reject`,
    'getPrn'
  ],
  [
    'manage obligations',
    (id) => `/producer/${id}/obligations`,
    'organisation',
    'getOrganisationObligations',
    'getOrganisationPrns',
    'getComplianceDeclarations'
  ],
  [
    'material calculation',
    (id) => `/producer/${id}/obligations/plastic`,
    'organisation',
    'getOrganisationObligations'
  ],
  [
    'compliance record',
    (id) => `/producer/${id}/obligations/compliance-record`,
    'organisation'
  ]
].map(([name, url, ...apis]) => ({ name, url, apis }))

const csoPages = pages.map(({ name, url, apis }) => ({
  name: `compliance scheme ${name}`,
  url: () => url(schemeId).replace('/producer/', '/cso/'),
  apis
}))

describe('service error page for server errors', () => {
  let server
  let authHeaders
  let previousFlags

  const mocks = {
    organisation: vi.fn(),
    getOrganisationPrns: vi.fn(),
    getPrn: vi.fn(),
    getOrganisationObligations: vi.fn(),
    getComplianceDeclarations: vi.fn()
  }

  beforeAll(async () => {
    previousFlags = {
      showPrns: config.get('features.showPrns'),
      manageObligations: config.get('features.manageObligations')
    }
    config.set('features.showPrns', true)
    config.set('features.manageObligations', true)
    ;({ server, authHeaders } = await startAuthenticatedTestServer())
  })

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
    mocks.organisation.mockReset().mockResolvedValue({
      id: organisationId,
      name: 'Example Operator Ltd',
      businessCountry: 'GB-ENG'
    })
    mocks.getOrganisationPrns.mockReset().mockResolvedValue({
      prns: [prn],
      total: 1,
      page: 1,
      pageSize: 20
    })
    mocks.getPrn.mockReset().mockResolvedValue(prn)
    mocks.getOrganisationObligations
      .mockReset()
      .mockResolvedValue(obligationsResponse)
    mocks.getComplianceDeclarations
      .mockReset()
      .mockResolvedValue({ complianceDeclarations: [] })

    server.app.wasteOrganisationsApi = { getOrganisation: mocks.organisation }
    server.app.wasteObligationsApi = {
      getOrganisationPrns: mocks.getOrganisationPrns,
      getPrn: mocks.getPrn,
      getOrganisationObligations: mocks.getOrganisationObligations,
      getComplianceDeclarations: mocks.getComplianceDeclarations
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  afterAll(async () => {
    await stopTestServer(server)
    config.set('features.showPrns', previousFlags.showPrns)
    config.set('features.manageObligations', previousFlags.manageObligations)
  })

  async function get(url) {
    return injectAuthed(
      server,
      {
        method: 'GET',
        url: `${url}${url.includes('?') ? '&' : '?'}year=${year}`
      },
      authHeaders
    )
  }

  function expectServiceErrorPage(result) {
    const $ = load(result)
    const paragraphs = $('#main-content .govuk-grid-column-two-thirds p')

    expect($('[data-testid="app-heading-title"]').text().trim()).toBe(
      'Sorry, there is a problem with the service'
    )
    expect(paragraphs.eq(0).text().trim()).toBe('Try again later.')
    expect(paragraphs.eq(1).text().replace(/\s+/g, ' ').trim()).toBe(
      'Return to the homepage.'
    )
    expect(paragraphs.eq(1).find('a').attr('href')).toBe(
      config.get('eprPackaging.homeUrl')
    )
  }

  describe.each([
    ...pages.map((p) => ({ ...p, url: p.url.bind(null, organisationId) })),
    ...csoPages
  ])('$name', ({ url, apis }) => {
    test('renders when every API answers', async () => {
      const { statusCode } = await get(url(organisationId))

      expect(statusCode).toBe(statusCodes.ok)
    })

    test.each(
      apis.flatMap((api) =>
        serverErrors.map(([kind, error]) => [api, kind, error])
      )
    )(
      'shows the service error page when %s fails with %s',
      async (api, _kind, error) => {
        mocks[api].mockRejectedValue(error())

        const { result, statusCode } = await get(url(organisationId))

        expect(statusCode).toBe(statusCodes.internalServerError)
        expectServiceErrorPage(result)
      }
    )
  })

  test('renders the supplied Welsh content when Cymraeg is chosen', async () => {
    mocks.getOrganisationPrns.mockRejectedValue(new ApiError({ status: 500 }))

    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/producer/${organisationId}/prns?year=${year}&lang=cy`
      },
      authHeaders
    )

    const $ = load(result)
    const paragraphs = $('#main-content .govuk-grid-column-two-thirds p')

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect($('[data-testid="app-heading-title"]').text().trim()).toBe(
      'Yn anffodus, mae problem â’r gwasanaeth'
    )
    expect(paragraphs.eq(0).text().trim()).toBe(
      'Rhowch gynnig arall arni rywbryd eto.'
    )
    expect(paragraphs.eq(1).text().replace(/\s+/g, ' ').trim()).toBe(
      'Dychwelyd hafan.'
    )
    expect(paragraphs.eq(1).find('a').text()).toBe('hafan')
  })
})
