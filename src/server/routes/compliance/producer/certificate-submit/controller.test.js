import { describe, expect, test, vi, beforeEach } from 'vitest'

import { ApiError } from '#/server/services/base/api-error.js'
import {
  MOCK_AUTH_ORGANISATION_ID,
  MOCK_AUTH_USER_EMAIL,
  MOCK_AUTH_USER_ID
} from '#/test-helpers/auth-test-constants.js'

import {
  certificateSubmitController,
  certificateSubmitPostController
} from './controller.js'
import { presentObligationsForCertificateSubmit } from './obligation-presenter.js'
import { buildCertificateSubmitCacheKey } from './utils.js'

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

function testWasteOrganisation(organisationId, year, overrides = {}) {
  const { registrations, ...rest } = overrides

  return {
    id: organisationId,
    name: 'Example Org',
    address: {
      addressLine1: '1 High Street',
      town: 'Bristol',
      postcode: 'BS1 1AA'
    },
    registrations: registrations ?? [
      {
        type: 'LARGE_PRODUCER',
        status: 'REGISTERED',
        registrationYear: Number(year),
        updated: '2026-05-18T11:20:00Z'
      }
    ],
    ...rest
  }
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
          id: MOCK_AUTH_USER_ID,
          email: MOCK_AUTH_USER_EMAIL,
          firstName: 'Test',
          lastName: 'User',
          organisations: [
            {
              id: MOCK_AUTH_ORGANISATION_ID,
              organisationNumber: '100003'
            }
          ]
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
  const organisation = request.pre?.organisation
    ? testWasteOrganisation(organisationId, year, request.pre.organisation)
    : null
  const organisationName = organisation?.name ?? ''

  const cachedSubmitShape = {
    organisation,
    organisationId,
    obligationYear: Number(year),
    obligations: obligationsArray,
    obligationStatus: overallStatus,
    regulatorName: 'Environment Agency',
    regulatorEmail: 'packagingproducers@environment-agency.gov.uk'
  }

  const currentOrganisation = request.pre?.currentOrganisation ?? {
    id: organisationId,
    name: organisationName,
    organisationNumber: '100003'
  }

  const redis = redisClientStub(cachedSubmitShape)

  return {
    ...request,
    yar: request.yar ?? authedYar(),
    pre: {
      ...request.pre,
      organisation,
      submitter: request.pre?.submitter ?? {
        id: MOCK_AUTH_USER_ID,
        email: MOCK_AUTH_USER_EMAIL
      },
      currentOrganisation,
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
      'compliance/producer/certificate-submit/index',
      expect.any(Object)
    )
    expect(model).toMatchObject({
      year: 2026,
      regulatorName: 'Natural Resources Wales',
      regulatorEmail: 'packaging@naturalresourceswales.gov.uk',
      organisationName: 'Example Org',
      organisationNumber: '100003'
    })
    expect(model.obligationsTableRows?.length).toBeGreaterThan(0)
    expect(model.glassTableRows?.length).toBe(3)
    expect(model.organisationAddress).toBe('1 The Street, Cardiff, CF10 1AA')

    expect(request.server.app.redisClient.set).toHaveBeenCalledTimes(1)
    expect(request.server.app.redisClient.set).toHaveBeenCalledWith(
      buildCertificateSubmitCacheKey(MOCK_AUTH_USER_ID, organisationId, 2026),
      expect.any(String)
    )
    const cached = JSON.parse(
      request.server.app.redisClient.set.mock.calls[0][1]
    )
    expect(cached).toMatchObject({
      organisationId,
      obligationYear: 2026,
      obligationStatus: 'Met',
      regulatorName: 'Natural Resources Wales',
      regulatorEmail: 'packaging@naturalresourceswales.gov.uk',
      organisation: expect.objectContaining({
        id: organisationId,
        name: 'Example Org',
        businessCountry: 'GB-WLS'
      })
    })
    expect(cached).not.toHaveProperty('declarationText')
  })

  test('throws bad gateway when submit cache write fails', async () => {
    const h = { view: vi.fn() }
    const logger = { error: vi.fn() }
    const cacheError = new Error('redis unavailable')

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Example Org'
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: 'trace-1' },
      logger
    })
    request.server.app.redisClient.set.mockRejectedValue(cacheError)

    await expect(
      certificateSubmitController.handler(request, h)
    ).rejects.toMatchObject({
      output: {
        statusCode: 502,
        payload: { message: 'Unable to prepare certificate of compliance' }
      }
    })
    expect(logger.error).toHaveBeenCalledWith(
      { err: cacheError },
      `Failed to write certificate submit cache: organisationId=${organisationId}, year=2026`
    )
    expect(h.view).not.toHaveBeenCalled()
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
    expect(model.organisationNumber).toBe('100003')
    expect(model.organisationAddress).toBe('10, River Road, Leeds, LS1 1AA')
  })

  test('redirects to certificate view when a submitted declaration already exists', async () => {
    const redirect = vi.fn().mockReturnValue('REDIRECT')
    const h = { redirect }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        declarations: [
          {
            id: createdComplianceDeclarationId,
            status: 'Submitted',
            obligationYear: 2026
          }
        ],
        organisation: { businessCountry: 'GB-ENG', name: 'Example Org' },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const result = await certificateSubmitController.handler(request, h)

    expect(redirect).toHaveBeenCalledWith(
      `/compliance/producer/${organisationId}/certificate/${createdComplianceDeclarationId}`
    )
    expect(result).toBe('REDIRECT')
  })

  test('does not redirect when a submitted declaration exists for a different year', async () => {
    const redirect = vi.fn()
    const view = vi.fn((_viewName, model) => model)
    const h = { redirect, view }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        declarations: [
          {
            id: createdComplianceDeclarationId,
            status: 'Submitted',
            obligationYear: 2025
          }
        ],
        organisation: { businessCountry: 'GB-ENG', name: 'Example Org' },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    await certificateSubmitController.handler(request, h)

    expect(redirect).not.toHaveBeenCalled()
    expect(view).toHaveBeenCalled()
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

const createdComplianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'

describe('certificateSubmitPostController', () => {
  const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

  beforeEach(() => {
    wasteObligationsApi.createComplianceDeclaration.mockReset()
    wasteObligationsApi.createComplianceDeclaration.mockResolvedValue({
      id: createdComplianceDeclarationId
    })
  })

  test('re-renders submit page when fullName is invalid', async () => {
    const view = vi.fn().mockReturnValue('VIEW')
    const h = { view }
    const cachedPayload = {
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
      organisationId,
      obligationYear: 2026,
      obligations: metObligationsResponse.obligations,
      obligationStatus: 'Met',
      regulatorName: 'Environment Agency',
      regulatorEmail: 'packagingproducers@environment-agency.gov.uk'
    }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      payload: { fullName: 'Jane@Doe' },
      pre: {
        cachedPayload,
        currentOrganisation: {
          id: organisationId,
          organisationNumber: '100003'
        }
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const result = await certificateSubmitPostController.handler(request, h)

    expect(view).toHaveBeenCalledWith(
      'compliance/producer/certificate-submit/index',
      expect.objectContaining({
        fullNameInput: 'Jane@Doe',
        formErrors: {
          summary: [
            {
              text: 'Your name cannot contain these characters: @, #, $, %, &, <, >',
              href: '#fullName'
            }
          ],
          fields: {
            fullName:
              'Your name cannot contain these characters: @, #, $, %, &, <, >'
          }
        }
      })
    )
    expect(
      wasteObligationsApi.createComplianceDeclaration
    ).not.toHaveBeenCalled()
    expect(result).toBe('VIEW')
  })

  test('re-renders submit page when fullName is missing from payload', async () => {
    const view = vi.fn().mockReturnValue('VIEW')
    const h = { view }
    const cachedPayload = {
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
      organisationId,
      obligationYear: 2026,
      obligations: metObligationsResponse.obligations,
      obligationStatus: 'Met',
      regulatorName: 'Environment Agency',
      regulatorEmail: 'packagingproducers@environment-agency.gov.uk'
    }

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      payload: {},
      pre: {
        cachedPayload,
        currentOrganisation: {
          id: organisationId,
          organisationNumber: '100003'
        }
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const result = await certificateSubmitPostController.handler(request, h)

    expect(view).toHaveBeenCalledWith(
      'compliance/producer/certificate-submit/index',
      expect.objectContaining({
        fullNameInput: '',
        formErrors: {
          summary: [
            {
              text: 'You must enter your full name',
              href: '#fullName'
            }
          ],
          fields: {
            fullName: 'You must enter your full name'
          }
        }
      })
    )
    expect(
      wasteObligationsApi.createComplianceDeclaration
    ).not.toHaveBeenCalled()
    expect(result).toBe('VIEW')
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
        isWelshLanguageToggle: false,
        user: {
          id: MOCK_AUTH_USER_ID,
          email: MOCK_AUTH_USER_EMAIL,
          name: 'Test User'
        },
        organisation: expect.objectContaining({
          id: organisationId,
          registrationType: 'DirectProducer',
          name: 'Example Org',
          referenceNumber: '100003'
        })
      })
    )
    expect(redirect).toHaveBeenCalledWith(
      `/compliance/producer/${organisationId}/certificate/${createdComplianceDeclarationId}/success`
    )
    expect(result).toBe('REDIRECT')
  })

  test('posts account name separately from submitter name when form value differs', async () => {
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
        submitterName: 'Jane Doe',
        user: expect.objectContaining({
          name: 'Test User'
        })
      })
    )
  })

  test('redirects in Welsh when lang=cy', async () => {
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
        isWelshLanguageToggle: true
      })
    )
    expect(redirect).toHaveBeenCalledWith(
      `/compliance/producer/${organisationId}/certificate/${createdComplianceDeclarationId}/success?lang=cy`
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
      expect.objectContaining({ obligationStatus: 'NotMet' })
    )
    expect(redirect).toHaveBeenCalledWith(
      `/compliance/producer/${organisationId}/certificate/${createdComplianceDeclarationId}/success`
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
    const cachePre = certificateSubmitPostController.options.pre.find(
      (handler) => handler.assign === 'cachedPayload'
    )
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
      { err: expect.any(Error) },
      `Submit cache payload failed validation: organisationId=${organisationId}, year=2026`
    )
  })

  test('cache pre-handler returns null when Redis read fails', async () => {
    const logger = { error: vi.fn() }
    const cachePre = certificateSubmitPostController.options.pre.find(
      (handler) => handler.assign === 'cachedPayload'
    )
    const request = {
      params: { organisationId },
      query: { year: 2026 },
      yar: authedYar(),
      server: {
        app: {
          redisClient: {
            get: vi.fn().mockRejectedValue(new Error('Redis unavailable'))
          }
        }
      },
      logger
    }

    const result = await cachePre.method(request)

    expect(result).toBeNull()
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      `Failed to parse submit cache payload for 2026 year: organisationId=${organisationId}, year=2026`
    )
  })

  test('renders submit error page when create compliance declaration fails', async () => {
    wasteObligationsApi.createComplianceDeclaration.mockRejectedValue(
      new Error('write failed')
    )
    const view = vi.fn().mockReturnValue('VIEW')
    const logger = { error: vi.fn() }

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
        currentOrganisation: {
          id: organisationId,
          organisationNumber: '100003'
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger
    })

    const result = await certificateSubmitPostController.handler(request, {
      view
    })

    expect(view).toHaveBeenCalledWith(
      'compliance/submit-error/index',
      expect.objectContaining({
        complianceType: 'certificate'
      })
    )
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      `Failed to create compliance declaration (organisationId=${organisationId}, year=2026, complianceType=certificate, status=unknown)`
    )
    expect(result).toBe('VIEW')
  })

  test('throws when create compliance declaration returns 404', async () => {
    wasteObligationsApi.createComplianceDeclaration.mockRejectedValue(
      new ApiError({ status: 404 })
    )

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
        currentOrganisation: {
          id: organisationId,
          organisationNumber: '100003'
        },
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
