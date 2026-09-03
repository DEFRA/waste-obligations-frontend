import { describe, expect, test, vi } from 'vitest'

import { REGULATION_43_URL } from '#/config/constants.js'
import { getRegulatorDetails } from '#/server/routes/compliance/_shared/regulator.js'
import { currentComplianceScheme } from '#/server/routes/compliance/_middlewares/current-compliance-scheme.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import * as complianceMiddlewares from '#/server/routes/compliance/_middlewares/index.js'
import * as organisationsMiddlewares from '#/server/routes/organisations/cso/_middlewares/index.js'
import { organisationsPrnRouteOptions } from '#/server/routes/organisations/_shared/organisations-route-options.js'
import { prnRoutes, prnSingleController } from './controller.js'

const schemeId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

describe('prnSingleController', () => {
  test('renders the PRN view with the organisation, PRN and regulator details', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = { id: 'prn-1', number: 'PRN123', status: 'Accepted' }
    const request = {
      params: { schemeId },
      query: { year: 2026 },
      pre: {
        organisation: {
          name: 'Example Operator Ltd',
          businessCountry: 'GB-SCT'
        },
        prn
      }
    }

    const { model } = await prnSingleController.handler(request, h)

    const expectedRegulator = getRegulatorDetails('GB-SCT', 'en')

    expect(h.view).toHaveBeenCalledWith(
      'organisations/views/prn',
      expect.objectContaining({
        schemeId,
        organisationName: 'Example Operator Ltd',
        year: 2026,
        prn,
        backLink: `/organisations/cso/${schemeId}/prns`,
        regulatorName: expectedRegulator.nameWithArticle,
        regulatorEmail: expectedRegulator.email,
        regulation43Url: REGULATION_43_URL
      })
    )
    expect(model.schemeId).toBe(schemeId)
  })

  test('links the accept button to the confirm-accept page for the compliance year', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { schemeId, prnId: 'prn-1' },
      query: { year: 2026 },
      pre: {
        organisation: { name: 'Example Operator Ltd' },
        prn: { id: 'prn-1' }
      }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.gotoPrnConfirmAccept).toBe(
      `/organisations/cso/${schemeId}/prns/prn-1/confirm-accept?year=2026`
    )
  })

  test('prefixes the accept-button link with the X-Forwarded-Prefix from a reverse proxy', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { schemeId, prnId: 'prn-1' },
      query: { year: 2026 },
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' },
      pre: {
        organisation: { name: 'Example Operator Ltd' },
        prn: { id: 'prn-1', status: 'AwaitingAcceptance' }
      }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.gotoPrnConfirmAccept).toBe(
      `/manage-recycling-obligations/organisations/cso/${schemeId}/prns/prn-1/confirm-accept?year=2026`
    )
  })

  test('passes isStatusEditable from the shared PRN status rule', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const base = {
      params: { schemeId, prnId: 'prn-1' },
      query: { year: 2026 },
      pre: { organisation: { name: 'Example Operator Ltd' } }
    }

    const awaiting = await prnSingleController.handler(
      {
        ...base,
        pre: { ...base.pre, prn: { id: 'prn-1', status: 'AwaitingAcceptance' } }
      },
      h
    )
    expect(awaiting.model.isStatusEditable).toBe(true)

    const cancelled = await prnSingleController.handler(
      {
        ...base,
        pre: { ...base.pre, prn: { id: 'prn-1', status: 'Cancelled' } }
      },
      h
    )
    expect(cancelled.model.isStatusEditable).toBe(false)
  })

  test('sets the back link to the PRNs list page', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { schemeId },
      query: { year: 2026 },
      pre: { organisation: { name: 'Example Operator Ltd' }, prn: { id: 'p' } }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.backLink).toBe(`/organisations/cso/${schemeId}/prns`)
  })

  test('prefixes the back link with the X-Forwarded-Prefix from a reverse proxy', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { schemeId },
      query: { year: 2026 },
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' },
      pre: { organisation: { name: 'Example Operator Ltd' }, prn: { id: 'p' } }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.backLink).toBe(
      `/manage-recycling-obligations/organisations/cso/${schemeId}/prns`
    )
  })

  test('ignores an invalid X-Forwarded-Prefix header', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { schemeId },
      query: { year: 2026 },
      headers: { 'x-forwarded-prefix': '//evil.example/path' },
      pre: { organisation: { name: 'Example Operator Ltd' }, prn: { id: 'p' } }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.backLink).toBe(`/organisations/cso/${schemeId}/prns`)
  })

  test('falls back to the PRN obligation year when the query year is missing', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = { id: 'prn-1', number: 'PRN123', obligationYear: 2024 }
    const request = {
      params: { schemeId },
      query: {},
      pre: { organisation: { name: 'Example Operator Ltd' }, prn }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.year).toBe(2024)
  })

  test('falls back to the current year when neither query nor PRN has a year', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { schemeId },
      query: {},
      pre: { organisation: { name: 'Example Operator Ltd' }, prn: { id: 'p' } }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.year).toBe(new Date().getFullYear())
  })

  test('falls back to the default regulator when the organisation is missing', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = { id: 'prn-2', number: 'PRN456', status: 'Rejected' }
    const request = {
      params: { schemeId },
      query: { year: 2025 },
      pre: { prn }
    }

    const { model } = await prnSingleController.handler(request, h)

    const expectedRegulator = getRegulatorDetails(undefined, 'en')

    expect(model.organisationName).toBeUndefined()
    expect(model.regulatorName).toBe(expectedRegulator.nameWithArticle)
    expect(model.regulatorEmail).toBe(expectedRegulator.email)
  })

  test('is configured as a GET route under /organisations/cso/{schemeId}/prns/{prnId}', () => {
    expect(prnSingleController.method).toBe('GET')
    expect(prnSingleController.path).toBe(
      '/organisations/cso/{schemeId}/prns/{prnId}'
    )
  })

  test('reuses the shared organisations route options', () => {
    expect(prnSingleController.options.validate).toBe(
      organisationsPrnRouteOptions.validate
    )
  })

  test('runs currentComplianceScheme and approvedUser before loading the organisation and PRN', () => {
    expect(prnSingleController.options.pre).toEqual([
      currentComplianceScheme,
      approvedUser,
      complianceMiddlewares.organisation,
      organisationsMiddlewares.prn
    ])
  })

  test('exports the controller as the only route', () => {
    expect(prnRoutes).toEqual([prnSingleController])
  })
})
