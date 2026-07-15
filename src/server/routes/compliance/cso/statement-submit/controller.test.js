import { describe, expect, test, vi, beforeEach } from 'vitest'

import {
  MOCK_AUTH_ORGANISATION_ID,
  MOCK_AUTH_USER_EMAIL,
  MOCK_AUTH_USER_ID
} from '#/test-helpers/auth-test-constants.js'

import {
  statementSubmitController,
  statementSubmitPostController
} from './controller.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/compliance/producer/certificate-submit/obligation-presenter.js'
import { buildStatementSubmitCacheKey } from './utils.js'

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

function testWasteOrganisation(schemeId, year, overrides = {}) {
  const { registrations, ...rest } = overrides

  return {
    id: schemeId,
    name: 'Example Scheme',
    address: {
      addressLine1: '1 High Street',
      town: 'Bristol',
      postcode: 'BS1 1AA'
    },
    registrations: registrations ?? [
      {
        type: 'COMPLIANCE_SCHEME',
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

  const schemeId = request.params?.schemeId
  const year = request.query?.year
  const organisation = request.pre?.organisation
    ? testWasteOrganisation(schemeId, year, request.pre.organisation)
    : null

  const cachedSubmitShape = {
    organisation,
    schemeId,
    obligationYear: Number(year),
    obligations: obligationsArray,
    obligationStatus: overallStatus,
    regulatorName: 'Environment Agency',
    regulatorEmail: 'packagingproducers@environment-agency.gov.uk',
    organisationNumber: '100003'
  }

  const redis = redisClientStub(cachedSubmitShape)

  return {
    ...request,
    yar: request.yar ?? authedYar(),
    pre: {
      ...request.pre,
      organisation,
      currentComplianceScheme: request.pre?.currentComplianceScheme ?? {
        operatorOrganisationId: MOCK_AUTH_ORGANISATION_ID
      },
      obligations: obligationsArray,
      cachedPayload: cachedSubmitShape
    },
    server: { app: { wasteObligationsApi, redisClient: redis } }
  }
}

const createdComplianceDeclarationId = '6830b9d4c7e21f5a8d3e64b2'

describe('statementSubmitController', () => {
  const schemeId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'

  test('renders submit view and writes cache', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = withServer({
      params: { schemeId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Example Scheme'
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const model = await statementSubmitController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'compliance/cso/statement-submit/index',
      expect.any(Object)
    )
    expect(model).toMatchObject({
      year: 2026,
      regulatorName: 'Environment Agency',
      organisationNumber: '100003'
    })
    expect(request.server.app.redisClient.set).toHaveBeenCalledWith(
      buildStatementSubmitCacheKey(MOCK_AUTH_USER_ID, schemeId, 2026),
      expect.any(String)
    )
  })

  test('throws bad gateway when submit cache write fails', async () => {
    const h = { view: vi.fn() }
    const logger = { error: vi.fn() }
    const cacheError = new Error('redis unavailable')

    const request = withServer({
      params: { schemeId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          name: 'Example Scheme'
        },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: 'trace-1' },
      logger
    })
    request.server.app.redisClient.set.mockRejectedValue(cacheError)

    await expect(
      statementSubmitController.handler(request, h)
    ).rejects.toMatchObject({
      output: {
        statusCode: 502,
        payload: { message: 'Unable to prepare statement of compliance' }
      }
    })
    expect(logger.error).toHaveBeenCalledWith(
      { err: cacheError },
      `Failed to write statement submit cache: schemeId=${schemeId}, year=2026`
    )
    expect(h.view).not.toHaveBeenCalled()
  })

  test('redirects to statement view when a submitted declaration already exists', async () => {
    const redirect = vi.fn().mockReturnValue('REDIRECT')
    const h = { redirect }

    const request = withServer({
      params: { schemeId },
      query: { year: 2026 },
      pre: {
        declarations: [
          {
            id: createdComplianceDeclarationId,
            status: 'Submitted',
            obligationYear: 2026
          }
        ],
        organisation: { businessCountry: 'GB-ENG', name: 'Example Scheme' },
        obligations: metObligationsResponse.obligations
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const result = await statementSubmitController.handler(request, h)

    expect(redirect).toHaveBeenCalledWith(
      `/compliance/cso/${schemeId}/statement/${createdComplianceDeclarationId}`
    )
    expect(result).toBe('REDIRECT')
  })
})

describe('statementSubmitPostController', () => {
  const schemeId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'

  beforeEach(() => {
    wasteObligationsApi.createComplianceDeclaration.mockReset()
    wasteObligationsApi.createComplianceDeclaration.mockResolvedValue({
      id: createdComplianceDeclarationId
    })
  })

  test('throws bad request when submit cache payload is missing', async () => {
    const request = {
      params: { schemeId },
      query: { year: 2026 },
      payload: { fullName: 'Jane Doe', regulation43Compliant: 'yes' },
      yar: authedYar(),
      pre: {
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
      statementSubmitPostController.handler(request, {})
    ).rejects.toMatchObject({
      output: {
        statusCode: 400,
        payload: { message: expect.stringContaining('2026') }
      }
    })
  })

  test('re-renders submit page when regulation 43 answer is missing', async () => {
    const view = vi.fn().mockReturnValue('VIEW')
    const h = { view }
    const cachedPayload = {
      organisation: {
        id: schemeId,
        name: 'Example Scheme',
        registrations: [
          {
            type: 'COMPLIANCE_SCHEME',
            status: 'REGISTERED',
            registrationYear: 2026,
            updated: '2026-05-18T11:20:00Z'
          }
        ]
      },
      schemeId,
      obligationYear: 2026,
      obligations: metObligationsResponse.obligations,
      obligationStatus: 'Met',
      regulatorName: 'Environment Agency',
      regulatorEmail: 'packagingproducers@environment-agency.gov.uk',
      organisationNumber: '100003'
    }

    const request = withServer({
      params: { schemeId },
      query: { year: 2026 },
      payload: { fullName: 'Jane Doe', regulation43Compliant: '' },
      pre: { cachedPayload },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    const result = await statementSubmitPostController.handler(request, h)

    expect(view).toHaveBeenCalledWith(
      'compliance/cso/statement-submit/index',
      expect.objectContaining({
        fullNameInput: 'Jane Doe',
        regulation43Input: ''
      })
    )
    expect(
      wasteObligationsApi.createComplianceDeclaration
    ).not.toHaveBeenCalled()
    expect(result).toBe('VIEW')
  })

  test('redirects to success when submission is valid', async () => {
    const redirect = vi.fn().mockReturnValue('REDIRECT')
    const h = { redirect }

    const request = withServer({
      params: { schemeId },
      query: { year: 2026 },
      payload: { fullName: 'Jane Doe', regulation43Compliant: 'yes' },
      pre: {
        organisation: {
          id: schemeId,
          name: 'Example Scheme',
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
      app: { traceId: 'tr-1' },
      logger: { error: vi.fn() }
    })

    const result = await statementSubmitPostController.handler(request, h)

    expect(
      wasteObligationsApi.createComplianceDeclaration
    ).toHaveBeenCalledWith(
      schemeId,
      expect.objectContaining({
        obligationYear: 2026,
        submitterName: 'Jane Doe',
        isRegulation43Compliant: true
      })
    )
    expect(redirect).toHaveBeenCalledWith(
      `/compliance/cso/${schemeId}/statement/${createdComplianceDeclarationId}/success`
    )
    expect(result).toBe('REDIRECT')
  })
})
