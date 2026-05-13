import { describe, expect, test, vi, beforeEach } from 'vitest'

import {
  certificateSubmitController,
  certificateSubmitPostController
} from './controller.js'

const wasteObligationsApi = vi.hoisted(() => ({
  createComplianceDeclaration: vi.fn()
}))

function withServer(request) {
  return {
    ...request,
    server: { app: { wasteObligationsApi } }
  }
}

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

describe('certificateSubmitController', () => {
  const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

  test('renders submit view with regulator from organisation', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = {
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
          }
        },
        obligations: metObligationsResponse
      },
      app: { traceId: null },
      logger: { error: vi.fn() }
    }

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
      organisationIdentifier: organisationId,
      overallStatus: 'met',
      breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Compliance' }]
    })
    expect(model.obligationsRows?.length).toBeGreaterThan(0)
    expect(model.glassRows?.length).toBe(3)
    expect(model.organisationAddress).toBe('1 The Street, Cardiff, CF10 1AA')
  })

  test('formats address using waste-organisations Address fields', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = {
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
          }
        },
        obligations: notMetObligationsResponse
      },
      app: { traceId: 't-1' },
      logger: { error: vi.fn() }
    }

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBe('Company Ltd')
    expect(model.organisationIdentifier).toBe(organisationId)
    expect(model.organisationAddress).toBe('10, River Road, Leeds, LS1 1AA')
    expect(model.overallStatus).toBe('not_met')
  })

  test('when organisation is missing uses empty name and default regulator', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = {
      params: { organisationId },
      query: { year: 2024 },
      pre: { organisation: null, obligations: metObligationsResponse },
      app: { traceId: null },
      logger: { error: vi.fn() }
    }

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBeUndefined()
    expect(model.organisationIdentifier).toBe(organisationId)
    expect(model.organisationAddress).toBe('')
    expect(model.regulatorEmail).toBe(
      'packaging-producers@environment-agency.gov.uk'
    )
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
          address: { addressLine1: '1 Lane' }
        },
        obligations: metObligationsResponse
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

  test('redirects with not_met when obligations are not met', async () => {
    const redirect = vi.fn().mockReturnValue('REDIRECT')
    const h = { redirect }

    const request = withServer({
      params: { organisationId },
      query: { year: 2024 },
      payload: { fullName: 'Jane Doe' },
      pre: {
        organisation: { id: organisationId, name: 'Co' },
        obligations: notMetObligationsResponse
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

  test('throws when create compliance declaration fails', async () => {
    wasteObligationsApi.createComplianceDeclaration.mockRejectedValue(
      new Error('write failed')
    )

    const request = withServer({
      params: { organisationId },
      query: { year: 2026 },
      payload: { fullName: 'Jane Doe' },
      pre: { organisation: null, obligations: metObligationsResponse },
      app: { traceId: null },
      logger: { error: vi.fn() }
    })

    await expect(
      certificateSubmitPostController.handler(request, {})
    ).rejects.toMatchObject({ output: { statusCode: 502 } })
  })
})
