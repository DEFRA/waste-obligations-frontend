import { describe, expect, test, vi } from 'vitest'

import {
  certificateSubmitController,
  certificateSubmitPostController
} from './controller.js'

describe('certificateSubmitController', () => {
  const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

  test('renders submit view with year in heading and regulator from organisation', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = {
      params: { organisationId },
      query: { year: 2026 },
      pre: {
        organisation: {
          businessCountry: 'GB-WLS',
          name: 'Example Org',
          organisationId: 'REF-001',
          address: '1 The Street, Cardiff'
        }
      }
    }

    const model = await certificateSubmitController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'compliance/certificate-submit/index',
      expect.any(Object)
    )
    expect(model).toMatchObject({
      pageTitle: 'Check and submit your certificate of compliance',
      heading: 'Check and submit your 2026 certificate of compliance',
      organisationId,
      year: 2026,
      regulatorName: 'Natural Resources Wales',
      regulatorEmail: 'packaging@naturalresourceswales.gov.uk',
      organisationName: 'Example Org',
      organisationIdentifier: 'REF-001',
      organisationAddress: '1 The Street, Cardiff',
      overallStatus: 'met',
      breadcrumbs: [{ text: 'Home', href: '/' }, { text: 'Compliance' }]
    })
    expect(model.obligationsRows?.length).toBeGreaterThan(0)
    expect(model.glassRows?.length).toBe(3)
  })

  test('uses organisationName and companyName fallbacks and formats structured address', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = {
      params: { organisationId },
      query: { year: 2025, mock: 'not_met' },
      pre: {
        organisation: {
          businessCountry: 'GB-ENG',
          companyName: 'Company Ltd',
          reference: 'REF-XYZ',
          registeredAddress: {
            buildingNumber: '10',
            street: 'River Road',
            town: 'Leeds',
            postcode: 'LS1 1AA'
          }
        }
      }
    }

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBe('Company Ltd')
    expect(model.organisationIdentifier).toBe('REF-XYZ')
    expect(model.organisationAddress).toBe('10, River Road, Leeds, LS1 1AA')
    expect(model.overallStatus).toBe('not_met')
  })

  test('when organisation is missing uses param id and empty name and address', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = {
      params: { organisationId },
      query: { year: 2024 },
      pre: { organisation: null }
    }

    const model = await certificateSubmitController.handler(request, h)

    expect(model.organisationName).toBe('')
    expect(model.organisationIdentifier).toBe(organisationId)
    expect(model.organisationAddress).toBe('')
    expect(model.regulatorEmail).toBe(
      'packaging-producers@environment-agency.gov.uk'
    )
  })
})

describe('certificateSubmitPostController', () => {
  const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

  test('redirects to success with met status by default', async () => {
    const redirect = vi.fn().mockReturnValue('REDIRECT')
    const h = { redirect }

    const request = {
      params: { organisationId },
      query: { year: 2026 },
      payload: { fullName: 'Jane Doe' }
    }

    const result = await certificateSubmitPostController.handler(request, h)

    expect(redirect).toHaveBeenCalledWith(
      `/compliance/${organisationId}/certificate/success?year=2026&status=met`
    )
    expect(result).toBe('REDIRECT')
  })

  test('redirects with not_met when mock query is not_met', async () => {
    const redirect = vi.fn().mockReturnValue('REDIRECT')
    const h = { redirect }

    const request = {
      params: { organisationId },
      query: { year: 2024, mock: 'not_met' },
      payload: { fullName: 'Jane Doe' }
    }

    await certificateSubmitPostController.handler(request, h)

    expect(redirect).toHaveBeenCalledWith(
      `/compliance/${organisationId}/certificate/success?year=2024&status=not_met`
    )
  })
})
