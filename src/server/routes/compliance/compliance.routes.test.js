import { vi } from 'vitest'

const getOrganisationMock = vi.fn()

const wasteObligationsApiMock = vi.hoisted(() => ({
  getOrganisationObligations: vi.fn(),
  getComplianceDeclarations: vi.fn(),
  getComplianceDeclaration: vi.fn(),
  createComplianceDeclaration: vi.fn()
}))

import { COMPLIANCE_SCHEME_PUBLIC_REGISTER_URL } from '#/config/constants.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { buildCertificateSubmitCacheKey } from '#/server/routes/compliance/producer/certificate-submit/utils.js'
import { ApiError } from '#/server/services/base/api-error.js'
import {
  cookieHeadersFromResponse,
  injectAuthed,
  startAuthenticatedTestServer,
  stopTestServer
} from '#/test-helpers/auth-helper.js'
import {
  extractCrumbFromHtml,
  injectAuthedPostForm
} from '#/test-helpers/csrf-helper.js'
import {
  MOCK_AUTH_USER_ID,
  MOCK_AUTH_USER_EMAIL
} from '#/test-helpers/auth-test-constants.js'
import { MOCK_COMPLIANCE_SCHEME_ID } from '#/test-helpers/mock-backend-account-api.js'

const unauthorisedOrganisationId = '923fa611-571c-4948-ab7d-fbb75e75ed65'
const schemeId = MOCK_COMPLIANCE_SCHEME_ID
const unauthorisedSchemeId = '923fa611-571c-4948-ab7d-fbb75e75ed66'

function certificateSubmitCacheKey(organisationId, year) {
  return buildCertificateSubmitCacheKey(MOCK_AUTH_USER_ID, organisationId, year)
}

function buildComplianceSchemeOrganisation(schemeId, year, overrides = {}) {
  return {
    id: schemeId,
    name: 'Scheme Operator Ltd',
    tradingName: 'Example Compliance Scheme',
    businessCountry: 'GB-ENG',
    address: {
      addressLine1: '1 High Street',
      town: 'Bristol',
      postcode: 'BS1 1AA'
    },
    registrations: [
      {
        type: 'COMPLIANCE_SCHEME',
        status: 'REGISTERED',
        registrationYear: Number(year),
        updated: '2026-05-18T11:20:00Z'
      }
    ],
    ...overrides
  }
}

const defaultObligationsPayload = {
  obligations: [
    {
      material: 'Plastic',
      recyclingTarget: 0.75,
      tonnages: {
        material: 100,
        awaitingAcceptance: 0,
        accepted: 100,
        outstanding: 0,
        obligated: 75
      },
      status: 'Met'
    }
  ]
}

function buildComplianceDeclaration(organisationId, year, options = {}) {
  const organisation =
    options.organisation ??
    buildCertificateSubmitRedisPayload(organisationId, year).organisation

  return {
    id: options.id ?? '6830b9d4c7e21f5a8d3e64b2',
    created: options.created ?? '2026-04-27T14:00:00+00:00',
    obligationYear: Number(year),
    obligationStatus: options.obligationStatus ?? 'Met',
    status: options.status,
    obligations: options.obligations ?? defaultObligationsPayload.obligations,
    submitterName: options.submitterName ?? 'Jane Doe',
    isRegulation43Compliant: options.isRegulation43Compliant ?? true,
    organisation: {
      id: organisationId,
      registrationType: 'DirectProducer',
      name: organisation.name,
      referenceNumber: options.referenceNumber ?? '154977',
      address: organisation.address,
      complianceSchemeName:
        options.complianceSchemeName ??
        organisation.complianceSchemeName ??
        null,
      schemeOperatorName:
        options.schemeOperatorName ?? organisation.schemeOperatorName ?? null,
      regulator: options.regulatorName ?? 'Environment Agency',
      regulatorEmail:
        options.regulatorEmail ??
        'packaging-producers@environment-agency.gov.uk'
    },
    audit: options.audit ?? [
      {
        action: 'Submitted',
        user: {
          id: 'e72be574-8b5b-4836-af47-dd7e0c0d1d87',
          email: options.userEmail ?? 'submitter@example.com',
          name: 'Test User'
        },
        timestamp: options.created ?? '2026-04-27T14:00:00+00:00'
      }
    ]
  }
}

/** Shape written by GET certificate/submit (Redis) and required by POST handler. */
function buildCertificateSubmitRedisPayload(
  organisationId,
  year,
  options = {}
) {
  const organisation = options.organisation ?? {
    id: organisationId,
    name: 'Cached Organisation',
    companiesHouseNumber: '12345678',
    address: {
      addressLine1: '1 High Street',
      town: 'Bristol',
      postcode: 'BS1 1AA'
    },
    registrations: [
      {
        type: 'LARGE_PRODUCER',
        status: 'REGISTERED',
        registrationYear: year,
        updated: '2026-05-18T11:20:00Z'
      }
    ]
  }

  return {
    organisation,
    organisationId,
    obligationYear: Number(year),
    obligations: options.obligations ?? defaultObligationsPayload.obligations,
    obligationStatus: options.obligationStatus ?? 'Met',
    regulatorName: options.regulatorName ?? 'Environment Agency',
    regulatorEmail:
      options.regulatorEmail ?? 'packaging-producers@environment-agency.gov.uk'
  }
}

describe('compliance routes', () => {
  let server
  let redisStore
  let authHeaders
  const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

  beforeAll(async () => {
    getOrganisationMock.mockResolvedValue(
      buildCertificateSubmitRedisPayload(organisationId, 2026).organisation
    )
    ;({ server, authHeaders } = await startAuthenticatedTestServer())
  })

  beforeEach(() => {
    getOrganisationMock.mockResolvedValue(
      buildCertificateSubmitRedisPayload(organisationId, 2026).organisation
    )
    getOrganisationMock.mockClear()
    wasteObligationsApiMock.getOrganisationObligations.mockReset()
    wasteObligationsApiMock.getComplianceDeclarations.mockReset()
    wasteObligationsApiMock.getComplianceDeclaration.mockReset()
    wasteObligationsApiMock.createComplianceDeclaration.mockReset()
    wasteObligationsApiMock.getOrganisationObligations.mockResolvedValue(
      defaultObligationsPayload
    )
    wasteObligationsApiMock.createComplianceDeclaration.mockResolvedValue({
      id: '6830b9d4c7e21f5a8d3e64b2'
    })
    wasteObligationsApiMock.getComplianceDeclarations.mockResolvedValue({
      complianceDeclarations: [buildComplianceDeclaration(organisationId, 2026)]
    })
    wasteObligationsApiMock.getComplianceDeclaration.mockImplementation(
      async (_organisationId, complianceDeclarationId) => {
        const yearMatch = complianceDeclarationId.match(/year-(\d{4})/)
        const year = yearMatch ? Number(yearMatch[1]) : 2026

        return buildComplianceDeclaration(organisationId, year, {
          id: complianceDeclarationId
        })
      }
    )
    server.app.wasteOrganisationsApi = {
      getOrganisation: getOrganisationMock
    }
    server.app.wasteObligationsApi = wasteObligationsApiMock

    redisStore = new Map()
    for (const y of ['2024', '2025', '2026']) {
      redisStore.set(
        certificateSubmitCacheKey(organisationId, y),
        JSON.stringify(
          buildCertificateSubmitRedisPayload(organisationId, Number(y))
        )
      )
    }
    server.app.redisClient = {
      set: vi.fn((key, value) => {
        redisStore.set(key, value)
        return Promise.resolve('OK')
      }),
      get: vi.fn((key) => Promise.resolve(redisStore.get(key) ?? null)),
      del: vi.fn((key) => {
        redisStore.delete(key)
        return Promise.resolve(1)
      })
    }
  })

  afterAll(async () => {
    await stopTestServer(server)
  })

  async function expectForbiddenForUnenrolledOrganisation(requestOptions) {
    const { result, statusCode } = await injectAuthed(
      server,
      requestOptions,
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.forbidden)
    expect(result).toEqual(expect.stringContaining('Forbidden'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
    expect(
      wasteObligationsApiMock.createComplianceDeclaration
    ).not.toHaveBeenCalled()
  }

  test('GET /compliance/{organisationId}/certificate renders page with year', async () => {
    const { load } = await import('cheerio')
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate?year=2024`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    const heading = $('[data-testid="app-heading-title"]').text().trim()
    expect($('title').text()).toContain(`${heading} |`)
    expect(result).toEqual(
      expect.stringContaining('About your 2024 certificate of compliance |')
    )
    expect(result).toEqual(expect.stringContaining('2024'))
    expect(result).toEqual(expect.stringContaining('You must:'))
    expect(result).toEqual(
      expect.stringContaining('check your organisation details')
    )
    expect(result).toEqual(
      expect.stringContaining('How to submit your certificate')
    )

    const mainOpenIndex = result.indexOf('id="main-content"')
    const phaseBannerIndex = result.indexOf('govuk-phase-banner')
    expect(mainOpenIndex).toBeGreaterThan(-1)
    expect(phaseBannerIndex).toBeGreaterThan(-1)
    expect(phaseBannerIndex).toBeLessThan(mainOpenIndex)
    expect(result).toEqual(expect.stringContaining('role="region"'))
    expect(result).toEqual(expect.stringContaining('aria-label="Beta banner"'))
    expect(result).toEqual(expect.stringContaining('aria-label="Back"'))
    expect(result).toEqual(expect.stringContaining('class="govuk-back-link"'))
  })

  test('GET /compliance/{organisationId}/certificate renders default regulator email', async () => {
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate?year=2024`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('packaging-producers@environment-agency.gov.uk')
    )
    expect(result).toEqual(
      expect.stringContaining(
        'mailto:packaging-producers@environment-agency.gov.uk'
      )
    )
  })

  test('GET /compliance/{organisationId}/statement renders page with year', async () => {
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/cso/${schemeId}/statement?year=2024`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('About your 2024 statement of compliance |')
    )
    expect(result).toEqual(expect.stringContaining('2024'))
    expect(result).toEqual(
      expect.stringContaining('Compliance schemes must comply with')
    )
    expect(result).toEqual(
      expect.stringContaining(
        'complied with all other regulation 43 requirements'
      )
    )
    expect(result).toEqual(
      expect.stringContaining('How to submit your statement')
    )
  })

  test('GET /compliance/{organisationId}/statement defaults regulator email to England', async () => {
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/cso/${schemeId}/statement?year=2024`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('packaging-producers@environment-agency.gov.uk')
    )
  })

  test('GET /compliance/{organisationId}/certificate uses businessCountry from organisation API', async () => {
    getOrganisationMock.mockResolvedValue({ businessCountry: 'GB-SCT' })

    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate?year=2024`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('producer.responsibility@sepa.org.uk')
    )
  })

  test('GET /compliance/{organisationId}/certificate loads organisation details', async () => {
    const { statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate?year=2024`,
        headers: {
          'x-cdp-request-id': 'trace-abc-123'
        }
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(getOrganisationMock).toHaveBeenCalledWith(organisationId)
  })

  test('GET /compliance/{organisationId}/certificate returns 500 when organisation lookup fails', async () => {
    getOrganisationMock.mockRejectedValueOnce(new Error('service unavailable'))

    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate?year=2024`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(getOrganisationMock).toHaveBeenCalledWith(organisationId)
    expect(result).toEqual(
      expect.stringContaining(
        'Sorry, there is a technical problem | Report packaging data'
      )
    )
  })

  test('GET /compliance/{organisationId}/certificate returns 404 when organisation is not found', async () => {
    getOrganisationMock.mockRejectedValueOnce(
      ApiError.from({
        message: 'not found',
        status: statusCodes.notFound,
        body: { title: 'Not Found', detail: 'missing' }
      })
    )

    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate?year=2024`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.notFound)
    expect(result).toEqual(
      expect.stringContaining('Page not found | Report packaging data')
    )
  })

  test('GET /compliance/{organisationId}/certificate returns 403 when user lacks organisation access', async () => {
    await expectForbiddenForUnenrolledOrganisation({
      method: 'GET',
      url: `/compliance/producer/${unauthorisedOrganisationId}/certificate?year=2024`
    })
  })

  test('GET /compliance/cso/{schemeId}/statement returns 403 when user lacks scheme access', async () => {
    await expectForbiddenForUnenrolledOrganisation({
      method: 'GET',
      url: `/compliance/cso/${unauthorisedSchemeId}/statement?year=2024`
    })
  })

  test('GET /compliance/{organisationId}/certificate/submit returns 403 when user lacks organisation access', async () => {
    await expectForbiddenForUnenrolledOrganisation({
      method: 'GET',
      url: `/compliance/producer/${unauthorisedOrganisationId}/certificate/submit?year=2026`
    })
  })

  test('GET /compliance/{organisationId}/certificate/{complianceDeclarationId}/success returns 403 when user lacks organisation access', async () => {
    await expectForbiddenForUnenrolledOrganisation({
      method: 'GET',
      url: `/compliance/producer/${unauthorisedOrganisationId}/certificate/6830b9d4c7e21f5a8d3e64b2/success`
    })
  })

  test('POST /compliance/{organisationId}/certificate/submit returns 403 when user lacks organisation access', async () => {
    await expectForbiddenForUnenrolledOrganisation({
      method: 'POST',
      url: `/compliance/producer/${unauthorisedOrganisationId}/certificate/submit?year=2026`,
      payload: { fullName: 'Jane Doe' }
    })
  })

  test('GET /compliance/{organisationId}/certificate returns 400 when organisationId is invalid', async () => {
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: '/compliance/producer/%20/certificate?year=2024'
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/certificate returns 400 when year is missing', async () => {
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/statement returns 400 when year is out of range', async () => {
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/cso/${schemeId}/statement?year=1900`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/certificate returns bad request when lang=cy', async () => {
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate?lang=cy`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/certificate/submit back link returns to previous page', async () => {
    const certificatePage = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate?year=2024`
      },
      authHeaders
    )

    expect(certificatePage.statusCode).toBe(statusCodes.ok)

    const submitPage = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate/submit?year=2026`,
        headers: {
          ...cookieHeadersFromResponse(certificatePage)
        }
      },
      authHeaders
    )

    expect(submitPage.statusCode).toBe(statusCodes.ok)
    expect(submitPage.result).toEqual(
      expect.stringContaining(
        `href="/compliance/producer/${organisationId}/certificate?year=2024"`
      )
    )
  })

  test('GET /compliance/{organisationId}/certificate/submit renders submit page with year', async () => {
    getOrganisationMock.mockResolvedValue({
      ...buildCertificateSubmitRedisPayload(organisationId, 2026).organisation,
      businessCountry: 'GB-ENG',
      name: 'Petrie and Tew Limited',
      address: {
        addressLine1: 'Pikash Lane',
        town: 'Keynsham',
        postcode: 'BS31 1TP'
      }
    })

    const { load } = await import('cheerio')
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate/submit?year=2026`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('title').text()).toContain(
      'Check and submit your certificate of compliance |'
    )
    expect($('title').text()).not.toContain('2026')
    expect($('[data-testid="app-heading-title"]').text().trim()).toBe(
      'Check and submit your 2026 certificate of compliance'
    )
    expect(result).toEqual(expect.stringContaining('id="csrf-crumb"'))
    expect(result).toEqual(expect.stringContaining('name="CSRFToken"'))
    expect(result).toEqual(expect.stringContaining('id="summary-list-heading"'))
    expect(result).toEqual(
      expect.stringContaining(
        'Check and submit your 2026 certificate of compliance'
      )
    )
    expect(result).toEqual(expect.stringContaining('Petrie and Tew Limited'))
    expect(result).toEqual(
      expect.stringContaining('Recycling obligations have been met')
    )
  })

  test('GET /compliance/{organisationId}/certificate/submit shows not met when obligations API returns NotMet', async () => {
    getOrganisationMock.mockResolvedValue({
      ...buildCertificateSubmitRedisPayload(organisationId, 2026).organisation,
      businessCountry: 'GB-ENG',
      name: 'Petrie and Tew Limited',
      address: {
        addressLine1: 'Pikash Lane',
        town: 'Keynsham',
        postcode: 'BS31 1TP'
      }
    })

    wasteObligationsApiMock.getOrganisationObligations.mockResolvedValueOnce({
      obligations: [
        {
          material: 'Wood',
          recyclingTarget: 0.5,
          tonnages: {
            material: 100,
            awaitingAcceptance: 0,
            accepted: 0,
            outstanding: 100,
            obligated: 80
          },
          status: 'NotMet'
        }
      ]
    })

    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate/submit?year=2026`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('Recycling obligations have not been met')
    )
    expect(result).toEqual(expect.stringContaining('NOT MET'))
  })

  test('POST /compliance/{organisationId}/certificate/submit returns 403 without CSRF token', async () => {
    const { statusCode } = await injectAuthed(
      server,
      {
        method: 'POST',
        url: `/compliance/producer/${organisationId}/certificate/submit?year=2026`,
        payload: { fullName: 'Jane Doe' }
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.forbidden)
  })

  test('POST /compliance/{organisationId}/certificate/submit redirects to certificate success', async () => {
    const { headers, statusCode } = await injectAuthedPostForm(
      server,
      {
        url: `/compliance/producer/${organisationId}/certificate/submit?year=2026`,
        getUrl: `/compliance/producer/${organisationId}/certificate/submit?year=2026`,
        payload: { fullName: 'Jane Doe' }
      },
      authHeaders
    )

    expect(statusCode).toBe(302)
    expect(headers.location).toBe(
      `/compliance/producer/${organisationId}/certificate/6830b9d4c7e21f5a8d3e64b2/success`
    )
    expect(
      wasteObligationsApiMock.createComplianceDeclaration
    ).toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/certificate/{complianceDeclarationId} renders submitted certificate', async () => {
    const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate/${complianceDeclarationId}`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      wasteObligationsApiMock.getComplianceDeclaration
    ).toHaveBeenCalledWith(organisationId, complianceDeclarationId)
    expect(result).toEqual(
      expect.stringContaining('2026 certificate of compliance')
    )
    expect(result).toEqual(
      expect.stringContaining(
        'Producer Responsibility Obligations (Packaging and Packaging Waste) Regulations 2024'
      )
    )
    expect(result).toEqual(expect.stringContaining('Recycling obligations met'))
    expect(result).toEqual(expect.stringContaining('Certificate verified by:'))
    expect(result).toEqual(expect.stringContaining('Jane Doe'))
    expect(result).toEqual(
      expect.stringContaining('Return to your recycling obligations')
    )
    expect(result).toEqual(expect.stringContaining('Download or print'))
    expect(result).toEqual(expect.stringContaining('Test User'))
  })

  test('GET /compliance/{organisationId}/certificate/{complianceDeclarationId}/success shows confirmation from compliance declaration API', async () => {
    const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'
    const { load } = await import('cheerio')
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate/${complianceDeclarationId}/success`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('title').text()).toContain('Certificate of compliance submitted |')
    expect(
      wasteObligationsApiMock.getComplianceDeclaration
    ).toHaveBeenCalledWith(organisationId, complianceDeclarationId)
    expect(result).toEqual(
      expect.stringContaining(
        `We have sent a confirmation email to: ${MOCK_AUTH_USER_EMAIL}`
      )
    )
    expect(result).toEqual(
      expect.stringContaining('Manage your recycling obligations')
    )
    expect(result).toEqual(
      expect.stringContaining('met your recycling obligations')
    )
    expect(result).not.toEqual(
      expect.stringContaining('not met your recycling obligations')
    )
    expect(result).toEqual(
      expect.stringContaining('submitted your certificate of compliance')
    )
    expect(result).not.toEqual(expect.stringContaining('submitter@example.com'))
    expect(result).toEqual(expect.stringContaining('View your certificate'))
    expect(result).toEqual(
      expect.stringContaining('aria-label="Return to recycling obligations"')
    )
    expect(result).not.toEqual(
      expect.stringContaining('compliance.certificateSuccess.returnLink')
    )
    expect(result).toEqual(
      expect.stringContaining(
        `/compliance/producer/${organisationId}/certificate/${complianceDeclarationId}`
      )
    )
    expect(result).toEqual(
      expect.stringContaining('aria-labelledby="public-register-lead"')
    )
    expect(result).toEqual(
      expect.stringContaining('govuk-link--opens-in-new-window')
    )
  })

  test('GET /compliance/{organisationId}/certificate/{complianceDeclarationId}/success shows not met obligations text when declaration is NotMet', async () => {
    const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'
    const { load } = await import('cheerio')

    wasteObligationsApiMock.getComplianceDeclaration.mockResolvedValue(
      buildComplianceDeclaration(organisationId, 2026, {
        id: complianceDeclarationId,
        obligationStatus: 'NotMet'
      })
    )

    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate/${complianceDeclarationId}/success`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    const publicRegisterBullets = $(
      '[aria-labelledby="public-register-lead"] li'
    )
      .map((_, element) => $(element).text().trim())
      .get()
    expect(publicRegisterBullets[0]).toBe('not met your recycling obligations')
    expect(publicRegisterBullets[1]).toBe(
      'submitted your certificate of compliance'
    )
  })

  test('POST /compliance/{organisationId}/certificate/submit uses not_met when obligations API returns NotMet', async () => {
    redisStore.set(
      certificateSubmitCacheKey(organisationId, '2025'),
      JSON.stringify(
        buildCertificateSubmitRedisPayload(organisationId, 2025, {
          obligations: [
            {
              material: 'Wood',
              recyclingTarget: 0.5,
              tonnages: {
                material: 100,
                awaitingAcceptance: 0,
                accepted: 0,
                outstanding: 100,
                obligated: 80
              },
              status: 'NotMet'
            }
          ],
          obligationStatus: 'NotMet'
        })
      )
    )

    const formPage = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate/submit?year=2026`
      },
      authHeaders
    )
    const csrfToken = extractCrumbFromHtml(formPage.result)
    const postHeaders = {
      ...authHeaders,
      ...cookieHeadersFromResponse(formPage)
    }

    const { headers, statusCode } = await server.inject({
      method: 'POST',
      url: `/compliance/producer/${organisationId}/certificate/submit?year=2025`,
      payload: { fullName: 'Jane Doe', CSRFToken: csrfToken },
      headers: postHeaders
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toBe(
      `/compliance/producer/${organisationId}/certificate/6830b9d4c7e21f5a8d3e64b2/success`
    )
  })

  test('GET /compliance/{organisationId}/certificate/submit redirects when declaration already submitted', async () => {
    const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'
    wasteObligationsApiMock.getComplianceDeclarations.mockResolvedValue({
      complianceDeclarations: [
        buildComplianceDeclaration(organisationId, 2026, {
          id: complianceDeclarationId,
          status: 'Submitted'
        })
      ]
    })

    const { headers, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/producer/${organisationId}/certificate/submit?year=2026`
      },
      authHeaders
    )

    expect(statusCode).toBe(302)
    expect(headers.location).toBe(
      `/compliance/producer/${organisationId}/certificate/${complianceDeclarationId}`
    )
  })

  test('POST /compliance/{organisationId}/certificate/submit returns 400 when cache payload missing', async () => {
    const submitUrl = `/compliance/producer/${organisationId}/certificate/submit?year=2026`
    const formPage = await injectAuthed(
      server,
      { method: 'GET', url: submitUrl },
      authHeaders
    )
    const csrfToken = extractCrumbFromHtml(formPage.result)
    const postHeaders = {
      ...authHeaders,
      ...cookieHeadersFromResponse(formPage)
    }

    redisStore.delete(certificateSubmitCacheKey(organisationId, '2026'))

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: submitUrl,
      payload: { fullName: 'Jane Doe', CSRFToken: csrfToken },
      headers: postHeaders
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
  })

  test.each([
    {
      name: 'missing',
      payload: { fullName: '' },
      message: 'You must enter your full name',
      expectErrorTitle: true,
      expectInputValue: undefined
    },
    {
      name: 'too short',
      payload: { fullName: 'A' },
      message: 'Your name must be more than one character',
      expectErrorTitle: false,
      expectInputValue: undefined
    },
    {
      name: 'too long',
      payload: { fullName: 'x'.repeat(256) },
      message: 'Your name must be fewer than 255 characters',
      expectErrorTitle: false,
      expectInputValue: undefined
    },
    {
      name: 'invalid characters',
      payload: { fullName: 'Jane@Doe' },
      message: 'Your name cannot contain these characters: @, #, $, %, &, <, >',
      expectErrorTitle: false,
      expectInputValue: 'Jane@Doe'
    }
  ])(
    'POST /compliance/{organisationId}/certificate/submit re-renders page when fullName is $name',
    async ({ payload, message, expectErrorTitle, expectInputValue }) => {
      const { load } = await import('cheerio')

      const { result, statusCode } = await injectAuthedPostForm(
        server,
        {
          url: `/compliance/producer/${organisationId}/certificate/submit?year=2026`,
          getUrl: `/compliance/producer/${organisationId}/certificate/submit?year=2026`,
          payload
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      const $ = load(result)

      if (expectErrorTitle) {
        expect($('title').text()).toContain(
          'Error: Check and submit your certificate of compliance'
        )
      }

      expect($('.govuk-error-summary__list a').text().trim()).toBe(message)
      expect($('#fullName-error').text().trim()).toBe(`Error: ${message}`)

      if (expectInputValue !== undefined) {
        expect($('#fullName').val()).toBe(expectInputValue)
      }
    }
  )

  test('POST /compliance/{organisationId}/certificate/submit renders technical error when obligations API is unavailable', async () => {
    const { load } = await import('cheerio')
    wasteObligationsApiMock.createComplianceDeclaration.mockRejectedValueOnce(
      new ApiError({ status: 503 })
    )

    const { result, statusCode } = await injectAuthedPostForm(
      server,
      {
        url: `/compliance/producer/${organisationId}/certificate/submit?year=2026`,
        getUrl: `/compliance/producer/${organisationId}/certificate/submit?year=2026`,
        payload: { fullName: 'Jane Doe' }
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('[data-testid="app-heading-title"]').text().trim()).toBe(
      'Sorry, there has been a technical error'
    )
    expect($('.govuk-grid-column-two-thirds p').eq(0).text().trim()).toBe(
      'Your certificate of compliance may not have been submitted.'
    )
    expect($('.govuk-grid-column-two-thirds p').eq(1).text().trim()).toBe(
      'Check your email inbox for confirmation. If you have not received a confirmation email, you will need to submit your certificate again.'
    )
    expect(
      $('.govuk-grid-column-two-thirds p')
        .eq(2)
        .text()
        .replace(/\s+/g, ' ')
        .trim()
    ).toBe('Return to your account homepage.')
    expect($('.govuk-grid-column-two-thirds p').eq(2).find('a').text()).toBe(
      'homepage'
    )
    expect(
      $('.govuk-grid-column-two-thirds p').eq(2).find('a').attr('href')
    ).toBe('https://localhost:7084/report-data')
  })

  test('GET /compliance/cso/{schemeId}/statement shows continue when no submission exists', async () => {
    wasteObligationsApiMock.getComplianceDeclarations.mockResolvedValueOnce({
      complianceDeclarations: []
    })

    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/cso/${schemeId}/statement?year=2024`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining(
        `/compliance/cso/${schemeId}/statement/submit?year=2024`
      )
    )
  })

  test('GET /compliance/cso/{schemeId}/statement/submit renders submit page with year', async () => {
    wasteObligationsApiMock.getComplianceDeclarations.mockResolvedValueOnce({
      complianceDeclarations: []
    })
    getOrganisationMock.mockResolvedValueOnce(
      buildComplianceSchemeOrganisation(schemeId, 2026)
    )

    const { load } = await import('cheerio')
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/cso/${schemeId}/statement/submit?year=2026`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('title').text()).toContain(
      'Check and submit your statement of compliance |'
    )
    expect($('title').text()).not.toContain('2026')
    expect($('[data-testid="app-heading-title"]').text().trim()).toBe(
      'Check and submit your 2026 statement of compliance'
    )
    expect(result).toEqual(expect.stringContaining('id="csrf-crumb"'))
    expect(result).toEqual(expect.stringContaining('name="CSRFToken"'))
    expect(result).toEqual(
      expect.stringContaining(
        'Check and submit your 2026 statement of compliance'
      )
    )
    expect(result).toEqual(expect.stringContaining('Example Compliance Scheme'))
    expect(result).toEqual(expect.stringContaining('Scheme Operator Ltd'))
    expect(result).toEqual(expect.stringContaining('154977'))
    expect(result).toEqual(expect.stringContaining('1 High Street'))
    expect(result).toEqual(expect.stringContaining('BS1 1AA'))
    expect(result).toEqual(expect.stringContaining('Test User'))
    expect(result).toEqual(expect.stringContaining('Environment Agency'))
    expect(result).toEqual(
      expect.stringContaining('packaging-producers@environment-agency.gov.uk')
    )
    expect(result).toEqual(
      expect.stringContaining(
        'mailto:packaging-producers@environment-agency.gov.uk'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        'href="https://localhost:7084/report-data/manage-your-recycling-obligations"'
      )
    )
    expect(result).toEqual(expect.stringContaining('>Cancel</a>'))
    expect(result).toEqual(
      expect.stringContaining('Recycling obligations have been met')
    )
    expect(result).toEqual(expect.stringContaining('target="_blank"'))
    expect(result).toEqual(
      expect.stringContaining(
        'https://www.legislation.gov.uk/ukdsi/2024/9780348264654'
      )
    )
  })

  test('GET /compliance/cso/{schemeId}/statement/submit redirects when declaration already submitted', async () => {
    const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'
    wasteObligationsApiMock.getComplianceDeclarations.mockResolvedValue({
      complianceDeclarations: [
        buildComplianceDeclaration(schemeId, 2026, {
          id: complianceDeclarationId,
          status: 'Submitted'
        })
      ]
    })

    const { headers, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/cso/${schemeId}/statement/submit?year=2026`
      },
      authHeaders
    )

    expect(statusCode).toBe(302)
    expect(headers.location).toBe(
      `/compliance/cso/${schemeId}/statement/${complianceDeclarationId}`
    )
  })

  test.each([
    {
      businessCountry: 'GB-ENG',
      regulatorName: 'Environment Agency',
      regulatorEmail: 'packaging-producers@environment-agency.gov.uk'
    },
    {
      businessCountry: 'GB-SCT',
      regulatorName: 'Scottish Environment Protection Agency',
      regulatorEmail: 'producer.responsibility@sepa.org.uk'
    },
    {
      businessCountry: 'GB-WLS',
      regulatorName: 'Natural Resources Wales',
      regulatorEmail: 'packaging@naturalresourceswales.gov.uk'
    },
    {
      businessCountry: 'GB-NIR',
      regulatorName: 'Northern Ireland Environment Agency',
      regulatorEmail: 'packaging@daera-ni.gov.uk'
    }
  ])(
    'GET /compliance/cso/{schemeId}/statement/submit maps regulator details for $businessCountry',
    async ({ businessCountry, regulatorName, regulatorEmail }) => {
      wasteObligationsApiMock.getComplianceDeclarations.mockResolvedValueOnce({
        complianceDeclarations: []
      })
      getOrganisationMock.mockResolvedValueOnce(
        buildComplianceSchemeOrganisation(schemeId, 2026, { businessCountry })
      )

      const { result, statusCode } = await injectAuthed(
        server,
        {
          method: 'GET',
          url: `/compliance/cso/${schemeId}/statement/submit?year=2026`
        },
        authHeaders
      )

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(regulatorName))
      expect(result).toEqual(expect.stringContaining(regulatorEmail))
      expect(result).toEqual(
        expect.stringContaining(`mailto:${regulatorEmail}`)
      )
    }
  )

  test('GET /compliance/cso/{schemeId}/statement/submit returns 403 when user lacks scheme access', async () => {
    await expectForbiddenForUnenrolledOrganisation({
      method: 'GET',
      url: `/compliance/cso/${unauthorisedSchemeId}/statement/submit?year=2026`
    })
  })

  test('POST /compliance/cso/{schemeId}/statement/submit returns 403 when user lacks scheme access', async () => {
    await expectForbiddenForUnenrolledOrganisation({
      method: 'POST',
      url: `/compliance/cso/${unauthorisedSchemeId}/statement/submit?year=2026`,
      payload: {
        fullName: 'Jane Doe',
        regulation43Compliant: 'yes'
      }
    })
  })

  test('POST /compliance/cso/{schemeId}/statement/submit validates regulation 43 selection', async () => {
    getOrganisationMock.mockResolvedValue(
      buildComplianceSchemeOrganisation(schemeId, 2026)
    )

    const { result, statusCode } = await injectAuthedPostForm(
      server,
      {
        url: `/compliance/cso/${schemeId}/statement/submit?year=2026`,
        getUrl: `/compliance/cso/${schemeId}/statement/submit?year=2026`,
        payload: {
          fullName: 'Jane Doe',
          regulation43Compliant: ''
        }
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('You must select')
    expect(result).toContain('yes')
    expect(result).toContain('no')
    expect(result).toContain('to continue')
    expect(
      wasteObligationsApiMock.createComplianceDeclaration
    ).not.toHaveBeenCalled()
  })

  test('POST /compliance/cso/{schemeId}/statement/submit redirects to success page', async () => {
    getOrganisationMock.mockResolvedValue(
      buildComplianceSchemeOrganisation(schemeId, 2026)
    )

    const { headers, statusCode } = await injectAuthedPostForm(
      server,
      {
        url: `/compliance/cso/${schemeId}/statement/submit?year=2026`,
        getUrl: `/compliance/cso/${schemeId}/statement/submit?year=2026`,
        payload: {
          fullName: 'Jane Doe',
          regulation43Compliant: 'yes'
        }
      },
      authHeaders
    )

    expect(statusCode).toBe(302)
    expect(headers.location).toBe(
      `/compliance/cso/${schemeId}/statement/6830b9d4c7e21f5a8d3e64b2/success`
    )
    expect(
      wasteObligationsApiMock.createComplianceDeclaration
    ).toHaveBeenCalledWith(
      schemeId,
      expect.objectContaining({
        isRegulation43Compliant: true,
        submitterName: 'Jane Doe',
        organisation: expect.objectContaining({
          complianceSchemeName: 'Example Compliance Scheme',
          schemeOperatorName: 'Scheme Operator Ltd'
        })
      })
    )
  })

  test('POST /compliance/cso/{schemeId}/statement/submit renders technical error when obligations API is unavailable', async () => {
    const { load } = await import('cheerio')
    getOrganisationMock.mockResolvedValue(
      buildComplianceSchemeOrganisation(schemeId, 2026)
    )
    wasteObligationsApiMock.createComplianceDeclaration.mockRejectedValueOnce(
      new ApiError({ status: 503 })
    )

    const { result, statusCode } = await injectAuthedPostForm(
      server,
      {
        url: `/compliance/cso/${schemeId}/statement/submit?year=2026`,
        getUrl: `/compliance/cso/${schemeId}/statement/submit?year=2026`,
        payload: {
          fullName: 'Jane Doe',
          regulation43Compliant: 'yes'
        }
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('[data-testid="app-heading-title"]').text().trim()).toBe(
      'Sorry, there has been a technical error'
    )
    expect($('.govuk-grid-column-two-thirds p').eq(0).text().trim()).toBe(
      'Your statement of compliance may not have been submitted.'
    )
    expect($('.govuk-grid-column-two-thirds p').eq(1).text().trim()).toBe(
      'Check your email inbox for confirmation. If you have not received a confirmation email, you will need to submit your statement again.'
    )
    expect(
      $('.govuk-grid-column-two-thirds p')
        .eq(2)
        .text()
        .replace(/\s+/g, ' ')
        .trim()
    ).toBe('Return to your account homepage.')
    expect($('.govuk-grid-column-two-thirds p').eq(2).find('a').text()).toBe(
      'homepage'
    )
    expect(
      $('.govuk-grid-column-two-thirds p').eq(2).find('a').attr('href')
    ).toBe('https://localhost:7084/report-data')
  })

  test('GET /compliance/cso/{schemeId}/statement/{complianceDeclarationId}/success renders success page', async () => {
    const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'

    wasteObligationsApiMock.getComplianceDeclaration.mockResolvedValue(
      buildComplianceDeclaration(schemeId, 2026, {
        id: complianceDeclarationId,
        obligationStatus: 'Met',
        isRegulation43Compliant: true
      })
    )

    const { load } = await import('cheerio')
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/cso/${schemeId}/statement/${complianceDeclarationId}/success`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    const $ = load(result)
    expect($('title').text()).toContain('Statement of compliance submitted |')
    expect(
      wasteObligationsApiMock.getComplianceDeclaration
    ).toHaveBeenCalledWith(schemeId, complianceDeclarationId)
    expect(result).toEqual(
      expect.stringContaining(
        'You have submitted your 2026 statement of compliance'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        `We have sent a confirmation email to: ${MOCK_AUTH_USER_EMAIL}`
      )
    )
    expect(result).toEqual(
      expect.stringContaining('complied with regulation 43 requirements')
    )
    expect(result).toEqual(
      expect.stringContaining('submitted your statement of compliance')
    )
    expect(result).toEqual(
      expect.stringContaining(COMPLIANCE_SCHEME_PUBLIC_REGISTER_URL)
    )
    expect(result).toEqual(
      expect.stringContaining('Return to recycling obligations')
    )
    expect(result).toEqual(
      expect.stringContaining('aria-label="Return to recycling obligations"')
    )
    expect(result).not.toEqual(
      expect.stringContaining('compliance.statementSuccess.returnLink')
    )
    expect(result).toEqual(expect.stringContaining('View your statement'))
    expect(result).toEqual(
      expect.stringContaining(
        `/compliance/cso/${schemeId}/statement/${complianceDeclarationId}`
      )
    )
    expect(result).toEqual(
      expect.stringContaining('id="what-happens-next-heading"')
    )
    expect(result).toEqual(
      expect.stringContaining('aria-labelledby="regulator-may-ask"')
    )
    expect(result).toEqual(
      expect.stringContaining('govuk-link--opens-in-new-window')
    )
  })

  test('GET /compliance/cso/{schemeId}/statement/{complianceDeclarationId} renders submitted statement', async () => {
    const complianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'

    wasteObligationsApiMock.getComplianceDeclaration.mockResolvedValue(
      buildComplianceDeclaration(schemeId, 2026, {
        id: complianceDeclarationId,
        complianceSchemeName: 'Example Compliance Scheme',
        schemeOperatorName: 'Scheme Operator Ltd',
        isRegulation43Compliant: true
      })
    )

    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: `/compliance/cso/${schemeId}/statement/${complianceDeclarationId}`
      },
      authHeaders
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(
      wasteObligationsApiMock.getComplianceDeclaration
    ).toHaveBeenCalledWith(schemeId, complianceDeclarationId)
    expect(result).toEqual(
      expect.stringContaining('2026 statement of compliance')
    )
    expect(result).toEqual(
      expect.stringContaining(
        'Producer Responsibility Obligations (Packaging and Packaging Waste) Regulations 2024'
      )
    )
    expect(result).toEqual(expect.stringContaining('Example Compliance Scheme'))
    expect(result).toEqual(expect.stringContaining('Scheme Operator Ltd'))
    expect(result).toEqual(expect.stringContaining('Compliance status'))
    expect(result).toEqual(expect.stringContaining('Recycling obligations met'))
    expect(result).toEqual(
      expect.stringContaining(
        'complied with all other regulation 43 requirements'
      )
    )
    expect(result).toEqual(expect.stringContaining('Statement verified by:'))
    expect(result).toEqual(expect.stringContaining('Jane Doe'))
    expect(result).toEqual(
      expect.stringContaining('Return to your recycling obligations')
    )
    expect(result).toEqual(expect.stringContaining('Download as PDF'))
    expect(result).toEqual(expect.stringContaining('Print'))
    expect(result).toEqual(expect.stringContaining('Test User'))
  })
})
