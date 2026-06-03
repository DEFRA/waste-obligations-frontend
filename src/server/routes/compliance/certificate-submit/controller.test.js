import { describe, expect, test, vi, beforeEach } from 'vitest'

import {
  certificateSubmitController,
  certificateSubmitPostController
} from './controller.js'
import { presentObligationsForCertificateSubmit } from './obligation-presenter.js'
import { CERTIFICATE_SUBMIT_DECLARATION_API_TEXT_KEY } from '#/server/auth/constants.js'
import {
  MOCK_AUTH_USER_EMAIL,
  MOCK_AUTH_USER_ID
} from '#/test-helpers/auth-test-constants.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'

const wasteObligationsApi = vi.hoisted(() => ({
  createComplianceDeclaration: vi.fn()
}))

const metObligationsResponse = {
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

const notMetObligationsResponse = {
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
}

function redisClientStub(getPayload) {
  return {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi
      .fn()
      .mockImplementation(() => Promise.resolve(JSON.stringify(getPayload))),
    del: vi.fn().mockResolvedValue(1)
  }
}

function authedYar() {
  return {
    get(key) {
      if (key === 'user') {
        return {
          profile: {
            sub: MOCK_AUTH_USER_ID,
            oid: MOCK_AUTH_USER_ID,
            email: MOCK_AUTH_USER_EMAIL
          }
        }
      }
      return undefined
    },
    set: vi.fn(),
    clear: vi.fn()
  }
}

function withServer(request, obligationsOverride) {
  const obligationsArray = Array.isArray(obligationsOverride)
    ? obligationsOverride
    : (obligationsOverride?.obligations ??
      request.pre?.obligations ??
      metObligationsResponse.obligations)

  const { overallStatus } =
    presentObligationsForCertificateSubmit(obligationsArray)

  const organisationId = request.params?.organisationId
  const year = request.query?.year

  const cachedSubmitShape = {
    organisation: request.pre?.organisation ?? null,
    organisationId,
    obligationYear: Number(year),
    obligations: obligationsArray,
    obligationStatus: overallStatus
  }

  const redis = redisClientStub(cachedSubmitShape)

  return {
    ...request,
    yar: request.yar ?? authedYar(),
    pre: {
      ...request.pre,
      submitter: request.pre?.submitter ?? {
        id: MOCK_AUTH_USER_ID,
        email: MOCK_AUTH_USER_EMAIL
      },
      obligations: obligationsArray,
      cachedPayload: cachedSubmitShape
    },
    server: { app: { wasteObligationsApi, redisClient: redis } }
  }
}

describe('certificateSubmitController', () => {
  const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

  test('renders submit view with regulator from organisation', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-WLS',
          name: 'Example Org',
          address: {
            addressLine1: '1 The Street',
            town: 'Cardiff',
            postcode: 'CF10 1AA'
          },
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2025-05-18T11:20:00Z'
            }
          ]
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const model = await certificateSubmitController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'compliance/certificate-submit/index',
      expect.any(Object)
    )
    expect(model).toMatchObject({
      organisationId,
      year: 2026,
      regulatorName: 'Natural Resources Wales',
      regulatorEmail: 'packaging@naturalresourceswales.gov.uk',
      organisationName: 'Example Org',
      overallStatus: 'Met'
    })
    expect(model.obligationsRows?.length).toBeGreaterThan(0)
    expect(model.glassRows?.length).toBe(3)
    expect(model.organisationAddress).toBe('1 The Street, Cardiff, CF10 1AA')
  })

  test('formats address using waste-organisations Address fields', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = withServer({
      params: { organisationId },
      query: { year: 2025 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Company Ltd',
          address: {
            addressLine1: '10, River Road',
            town: 'Leeds',
            postcode: 'LS1 1AA'
          },
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2025,
              updated: '2025-05-18T11:20:00Z'
            }
          ]
        },
        obligations: notMetObligationsResponse.obligations
      },
      app: { traceId: 't-1' },
      logger: { error: vi.fn() }
    })

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBe('Company Ltd')
    expect(model.organisationId).toBe(organisationId)
    expect(model.organisationAddress).toBe('10, River Road, Leeds, LS1 1AA')
    expect(model.overallStatus).toBe('NotMet')
  })

  test('redirects to success when a submitted declaration already exists', async () => {
    const redirect = vi.fn().mockReturnValue('REDIRECT')
    const h = { redirect }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        declarations: [{ status: 'Submitted', obligationYear: 2026 }],
        organisation: { businessCountry: 'GB-ENG', name: 'Example Org' },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const result = await certificateSubmitController.handler(request, h)

    expect(redirect).toHaveBeenCalledWith(
      `/compliance/${organisationId}/certificate/success?year=2026`
    )
    expect(result).toBe('REDIRECT')
  })

  test('formats a string organisation address', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Example Org',
          address: '  10 High Street  ',
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2025-05-18T11:20:00Z'
            }
          ]
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationAddress).toBe('10 High Street')
  })

  test('when organisation is missing uses empty name and default regulator', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = withServer({
      params: { organisationId },
      query: { year: 2024 },
      pre: {
        organisation: null,
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBe('')
    expect(model.organisationId).toBe(organisationId)
    expect(model.organisationAddress).toBe('')
    expect(model.regulatorEmail).toBe(
      'packaging-producers@environment-agency.gov.uk'
    )
  })

  test('uses trading name for compliance scheme organisation', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Organisation Name',
          tradingName: 'Trading Name',
          registrations: [
            {
              type: 'COMPLIANCE_SCHEME',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBe('Trading Name')
  })

  test('uses name for direct producer organisation', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Organisation Name',
          tradingName: 'Trading Name',
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBe('Organisation Name')
  })

  test('falls back to organisation name when compliance scheme trading name is missing', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Organisation Name',
          tradingName: null,
          registrations: [
            {
              type: 'COMPLIANCE_SCHEME',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBe('Organisation Name')
  })

  test('falls back to organisation name registration type is not known', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Organisation Name',
          tradingName: null,
          registrations: [
            {
              type: 'SMALL_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBe('Organisation Name')
  })

  test('prefers registered registration over cancelled for same year', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Organisation Name',
          tradingName: 'Trading Name',
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'CANCELLED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            },
            {
              type: 'COMPLIANCE_SCHEME',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:21:00Z'
            }
          ]
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBe('Trading Name')
  })

  test('uses latest updated registration for same year', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Organisation Name',
          tradingName: 'Trading Name',
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            },
            {
              type: 'COMPLIANCE_SCHEME',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:10Z'
            }
          ]
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBe('Trading Name')
  })

  test('uses requested year when selecting organisation name', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = withServer({
      params: { organisationId },
      query: { year: 2025 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Organisation Name',
          tradingName: 'Trading Name',
          registrations: [
            {
              type: 'COMPLIANCE_SCHEME',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            },
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2025,
              updated: '2025-05-18T11:20:00Z'
            }
          ]
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBe('Organisation Name')
  })

  test('throws when no registration exists for requested year', async () => {
    const h = { view: vi.fn() }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Organisation Name',
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2025,
              updated: '2025-05-18T11:20:00Z'
            }
          ]
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    await expect(
      certificateSubmitController.handler(request, h)
    ).rejects.toThrow('No registration found, using year 2026')
  })
})

describe('certificateSubmitPostController', () => {
  const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

  beforeEach(() => {
    wasteObligationsApi.createComplianceDeclaration.mockReset()
    wasteObligationsApi.createComplianceDeclaration.mockResolvedValue({
      id: 'new-declaration'
    })
  })

  test('redirects to success with met status and posts compliance declaration', async () => {
    const redirect = vi.fn().mockReturnValue('REDIRECT')
    const h = { redirect }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      payload: { fullName: 'Jane Doe' },
      pre: {
        organisation: {
          id: organisationId,
          name: 'Example Org',
          address: { addressLine1: '1 Lane' },
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: 'tr-1' },
      logger: { error: vi.fn() }
    })

    const result = await certificateSubmitPostController.handler(request, h)

    expect(
      wasteObligationsApi.createComplianceDeclaration
    ).toHaveBeenCalledWith(
      organisationId,
      expect.objectContaining({
        obligationYear: 2026,
        obligationStatus: 'Met',
        submitterName: 'Jane Doe',
        user: {
          id: MOCK_AUTH_USER_ID,
          email: MOCK_AUTH_USER_EMAIL
        },
        organisation: expect.objectContaining({
          id: organisationId,
          name: 'Example Org'
        })
      }),
      'tr-1'
    )
    expect(redirect).toHaveBeenCalledWith(
      `/compliance/${organisationId}/certificate/success?year=2026`
    )
    expect(result).toBe('REDIRECT')
  })

  test('submits declaration text and redirect in Welsh when lang=cy', async () => {
    const redirect = vi.fn().mockReturnValue('REDIRECT')
    const h = { redirect }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026, lang: 'cy' },
      payload: { fullName: 'Jane Doe' },
      pre: {
        organisation: {
          id: organisationId,
          name: 'Example Org',
          address: { addressLine1: '1 Lane' },
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2026,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: 'tr-1' },
      logger: { error: vi.fn() }
    })

    await certificateSubmitPostController.handler(request, h)

    expect(
      wasteObligationsApi.createComplianceDeclaration
    ).toHaveBeenCalledWith(
      organisationId,
      expect.objectContaining({
        declarationText: {
          text: translate('cy', CERTIFICATE_SUBMIT_DECLARATION_API_TEXT_KEY),
          language: 'cy'
        }
      }),
      'tr-1'
    )
    expect(redirect).toHaveBeenCalledWith(
      `/compliance/${organisationId}/certificate/success?year=2026&lang=cy`
    )
  })

  test('redirects with NotMet when obligations are not met', async () => {
    const redirect = vi.fn().mockReturnValue('REDIRECT')
    const h = { redirect }

    const request = withServer({
      params: { organisationId },
      query: { year: 2024 },
      payload: { fullName: 'Jane Doe' },
      pre: {
        organisation: {
          id: organisationId,
          name: 'Co',
          registrations: [
            {
              type: 'LARGE_PRODUCER',
              status: 'REGISTERED',
              registrationYear: 2024,
              updated: '2026-05-18T11:20:00Z'
            }
          ]
        },
        obligations: notMetObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    await certificateSubmitPostController.handler(request, h)

    expect(
      wasteObligationsApi.createComplianceDeclaration
    ).toHaveBeenCalledWith(
      organisationId,
      expect.objectContaining({ obligationStatus: 'NotMet' }),
      null
    )
    expect(redirect).toHaveBeenCalledWith(
      `/compliance/${organisationId}/certificate/success?year=2024`
    )
  })

  test('throws bad request when submit cache payload is missing', async () => {
    const request = {
      params: { organisationId },
      query: { year: 2026 },
      payload: { fullName: 'Jane Doe' },
      yar: authedYar(),
      pre: {
        submitter: { id: MOCK_AUTH_USER_ID, email: MOCK_AUTH_USER_EMAIL },
        cachedPayload: null
      },
      app: { traceId: null },
      server: {
        app: {
          wasteObligationsApi,
          redisClient: { del: vi.fn() }
        }
      },
      logger: { error: vi.fn() }
    }

    await expect(
      certificateSubmitPostController.handler(request, {})
    ).rejects.toMatchObject({
      output: {
        statusCode: 400,
        payload: { message: expect.stringContaining('2026') }
      }
    })
  })

  test('cache pre-handler returns null when Redis payload is invalid JSON', async () => {
    const logger = { error: vi.fn() }
    const cachePre = certificateSubmitPostController.options.pre[1]
    const request = {
      params: { organisationId },
      query: { year: 2026 },
      yar: authedYar(),
      pre: {
        submitter: { id: MOCK_AUTH_USER_ID, email: MOCK_AUTH_USER_EMAIL }
      },
      server: {
        app: {
          redisClient: {
            get: vi.fn().mockResolvedValue('{not-valid-json')
          }
        }
      },
      logger
    }

    const result = await cachePre.method(request)

    expect(result).toBeNull()
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId, year: 2026 }),
      expect.stringContaining('Failed to parse submit cache payload')
    )
  })

  test('throws when create compliance declaration fails', async () => {
    wasteObligationsApi.createComplianceDeclaration.mockRejectedValue(
      new Error('write failed')
    )

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      payload: { fullName: 'Jane Doe' },
      pre: {
        organisation: null,
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    await expect(
      certificateSubmitPostController.handler(request, {})
    ).rejects.toMatchObject({ output: { statusCode: 502 } })
  })
})
