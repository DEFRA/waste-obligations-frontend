import { vi } from 'vitest'

const getOrganisationMock = vi.fn()

const wasteObligationsApiMock = vi.hoisted(() => ({
  getOrganisationObligations: vi.fn(),
  getComplianceDeclarations: vi.fn(),
  createComplianceDeclaration: vi.fn()
}))

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { ApiError } from '#/server/services/base/api-error.js'

const CERT_SUBMIT_CACHE_PREFIX = 'compliance-certificate-submit'
const MOCK_USER_ID = '00000000-0000-4000-8000-000000000001'

function certificateSubmitCacheKey(organisationId, year) {
  return `${CERT_SUBMIT_CACHE_PREFIX}:${MOCK_USER_ID}:${organisationId}:${year}`
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

/** Shape written by GET certificate/submit (Redis) and required by POST handler. */
function buildCertificateSubmitRedisPayload(
  organisationId,
  year,
  options = {}
) {
  return {
    organisation: options.organisation ?? {
      id: organisationId,
      name: 'Cached Organisation',
      companiesHouseNumber: '12345678',
      address: {
        addressLine1: '1 High Street',
        town: 'Bristol',
        postcode: 'BS1 1AA'
      }
    },
    organisationId,
    obligationYear: Number(year),
    obligations: options.obligations ?? defaultObligationsPayload.obligations,
    obligationStatus: options.obligationStatus ?? 'Met'
  }
}

describe('compliance routes', () => {
  let server
  let redisStore
  const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

  beforeAll(async () => {
    getOrganisationMock.mockResolvedValue({ businessCountry: 'GB-ENG' })
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    getOrganisationMock.mockResolvedValue({ businessCountry: 'GB-ENG' })
    getOrganisationMock.mockClear()
    wasteObligationsApiMock.getOrganisationObligations.mockReset()
    wasteObligationsApiMock.getComplianceDeclarations.mockReset()
    wasteObligationsApiMock.createComplianceDeclaration.mockReset()
    wasteObligationsApiMock.getOrganisationObligations.mockResolvedValue(
      defaultObligationsPayload
    )
    wasteObligationsApiMock.createComplianceDeclaration.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000001'
    })
    wasteObligationsApiMock.getComplianceDeclarations.mockResolvedValue({
      complianceDeclarations: [
        {
          id: 'b5aa3ef6-e7d5-4eb2-acea-589573d5a005',
          created: '2026-04-27T14:00:00+00:00',
          obligationYear: 2026,
          obligationStatus: 'Met',
          user: { email: 'submitter@example.com' }
        }
      ]
    })
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
    await server.stop({ timeout: 0 })
  })

  test('GET /compliance/{organisationId}/certificate renders page with year', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('About your certificate of compliance |')
    )
    expect(result).toEqual(expect.stringContaining('2024'))
  })

  test('GET /compliance/{organisationId}/certificate renders default regulator email', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024`
    })

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
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/statement?year=2024`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('About your statement of compliance |')
    )
    expect(result).toEqual(expect.stringContaining('2024'))
  })

  test('GET /compliance/{organisationId}/statement defaults regulator email to England', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/statement?year=2024`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('packaging-producers@environment-agency.gov.uk')
    )
  })

  test('GET /compliance/{organisationId}/certificate uses businessCountry from organisation API', async () => {
    getOrganisationMock.mockResolvedValue({ businessCountry: 'GB-SCT' })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('producer.responsibility@sepa.org.uk')
    )
  })

  test('GET /compliance/{organisationId}/certificate forwards trace header to organisation API call', async () => {
    const traceId = 'trace-abc-123'

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024`,
      headers: {
        'x-cdp-request-id': traceId
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(getOrganisationMock).toHaveBeenCalledWith(organisationId, traceId)
  })

  test('GET /compliance/{organisationId}/certificate continues when organisation lookup fails', async () => {
    getOrganisationMock.mockRejectedValueOnce(new Error('service unavailable'))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(getOrganisationMock).toHaveBeenCalledWith(organisationId, null)
    expect(result).toEqual(
      expect.stringContaining('packaging-producers@environment-agency.gov.uk')
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

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024`
    })

    expect(statusCode).toBe(statusCodes.notFound)
    expect(result).toEqual(
      expect.stringContaining('Page not found | Report packaging data')
    )
  })

  test('GET /compliance/{organisationId}/certificate returns 400 when organisationId is invalid', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/compliance/%20/certificate?year=2024'
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/certificate returns 400 when year is missing', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate`
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/statement returns 400 when year is out of range', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/statement?year=1900`
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/certificate returns bad request when lang=cy', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?lang=cy`
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/certificate/submit renders submit page with year', async () => {
    getOrganisationMock.mockResolvedValue({
      businessCountry: 'GB-ENG',
      name: 'Petrie and Tew Limited',
      organisationId: '123 456',
      address: 'Pikash Lane, Keynsham, Bristol, BS31 1TP'
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate/submit?year=2026`
    })

    expect(statusCode).toBe(statusCodes.ok)
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
      businessCountry: 'GB-ENG',
      name: 'Petrie and Tew Limited',
      organisationId: '123 456',
      address: 'Pikash Lane, Keynsham, Bristol, BS31 1TP'
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

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate/submit?year=2026`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('Recycling obligations have not been met')
    )
    expect(result).toEqual(expect.stringContaining('Not met'))
  })

  test('POST /compliance/{organisationId}/certificate/submit redirects to success', async () => {
    const { headers, statusCode } = await server.inject({
      method: 'POST',
      url: `/compliance/${organisationId}/certificate/submit?year=2026`,
      payload: { fullName: 'Jane Doe' }
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toBe(
      `/compliance/${organisationId}/certificate/success?year=2026`
    )
    expect(
      wasteObligationsApiMock.createComplianceDeclaration
    ).toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/certificate/success shows confirmation from compliance declarations API', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate/success?year=2026`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(wasteObligationsApiMock.getComplianceDeclarations).toHaveBeenCalled()
    expect(result).toEqual(
      expect.stringContaining(
        'We have sent a confirmation email to everybody registered on your account.'
      )
    )
    expect(result).toEqual(
      expect.stringContaining(
        'You submitted your certificate of compliance with a ‘Met’ status.'
      )
    )
    expect(result).not.toEqual(expect.stringContaining('submitter@example.com'))
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

    const { headers, statusCode } = await server.inject({
      method: 'POST',
      url: `/compliance/${organisationId}/certificate/submit?year=2025`,
      payload: { fullName: 'Jane Doe' }
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toBe(
      `/compliance/${organisationId}/certificate/success?year=2025`
    )
  })

  test('GET /compliance/{organisationId}/certificate/submit redirects when declaration already submitted', async () => {
    wasteObligationsApiMock.getComplianceDeclarations.mockResolvedValue({
      complianceDeclarations: [
        {
          id: 'submitted-declaration',
          created: '2026-04-27T14:00:00+00:00',
          obligationYear: 2026,
          obligationStatus: 'Met',
          status: 'Submitted',
          user: { email: 'submitter@example.com' }
        }
      ]
    })

    const { headers, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate/submit?year=2026`
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toBe(
      `/compliance/${organisationId}/certificate/success?year=2026`
    )
  })

  test('POST /compliance/{organisationId}/certificate/submit returns 400 when cache payload missing', async () => {
    redisStore.delete(certificateSubmitCacheKey(organisationId, '2026'))

    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: `/compliance/${organisationId}/certificate/submit?year=2026`,
      payload: { fullName: 'Jane Doe' }
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
  })

  test('POST /compliance/{organisationId}/certificate/submit returns 400 when fullName missing', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: `/compliance/${organisationId}/certificate/submit?year=2026`,
      payload: { fullName: '' }
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
  })

  test('POST /compliance/{organisationId}/certificate/submit returns 400 when fullName exceeds max length', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: `/compliance/${organisationId}/certificate/submit?year=2026`,
      payload: { fullName: 'x'.repeat(201) }
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
  })
})
