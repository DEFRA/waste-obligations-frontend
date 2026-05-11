import { describe, expect, test, vi } from 'vitest'

import { certificateSuccessController } from './controller.js'

describe('certificateSuccessController', () => {
  test('renders view with formatted status and query email', async () => {
    const h = {
      view: vi.fn((_viewName, model) => ({ model }))
    }

    const request = {
      params: { organisationId: 'org-1' },
      query: { year: 2026, status: 'met', email: 'approved@example.com' },
      pre: { organisation: { businessCountry: 'GB-ENG' } }
    }

    const { model } = await certificateSuccessController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'compliance/certificate-success/index',
      expect.any(Object)
    )
    expect(model).toMatchObject({
      organisationId: 'org-1',
      year: 2026,
      obligationStatus: 'Met',
      approvedUserEmail: 'approved@example.com',
      regulatorName: 'Environment Agency',
      regulatorEmail: 'packaging-producers@environment-agency.gov.uk',
      publicRegisterUrl:
        'https://report-packaging-data.defra.gov.uk/public-register'
    })
  })

  test('renders view with formatted status and empty email when none provided', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = {
      params: { organisationId: 'org-1' },
      query: { year: 2026, status: 'not_met' },
      pre: { organisation: { businessCountry: 'GB-SCT' } }
    }

    const model = await certificateSuccessController.handler(request, h)

    expect(model.approvedUserEmail).toBe('')
    expect(model.obligationStatus).toBe('Not met')
    expect(model.regulatorName).toBe('Scottish Environment Protection Agency')
    expect(model.regulatorEmail).toBe('producer.responsibility@sepa.org.uk')
  })

  test('falls back to query email when session email missing', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = {
      params: { organisationId: 'org-1' },
      query: { year: 2026, status: 'met', email: 'query@example.com' },
      pre: { organisation: { businessCountry: 'GB-WLS' } }
    }

    const model = await certificateSuccessController.handler(request, h)

    expect(model.approvedUserEmail).toBe('query@example.com')
    expect(model.regulatorName).toBe('Natural Resources Wales')
    expect(model.regulatorEmail).toBe('packaging@naturalresourceswales.gov.uk')
  })

  test('handles missing status defensively', async () => {
    const h = { view: vi.fn((_viewName, model) => model) }

    const request = {
      params: { organisationId: 'org-1' },
      query: { year: 2026 },
      pre: { organisation: { businessCountry: 'GB-NIR' } }
    }

    const model = await certificateSuccessController.handler(request, h)

    expect(model.obligationStatus).toBe('')
    expect(model.approvedUserEmail).toBe('')
    expect(model.regulatorName).toBe('Northern Ireland Environment Agency')
    expect(model.regulatorEmail).toBe('packaging@daera-ni.gov.uk')
  })
})
