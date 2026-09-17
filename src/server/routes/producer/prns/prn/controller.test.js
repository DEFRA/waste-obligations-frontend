import { describe, expect, test, vi } from 'vitest'

import { config } from '#/config/config.js'
import { REGULATION_43_URL } from '#/config/constants.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import * as complianceMiddlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import * as producerPrnMiddlewares from '#/server/routes/producer/_middlewares/index.js'
import { prnRouteOptions } from '#/server/routes/_shared/prns/prns-route-options.js'
import { prnRoutes, prnSingleController } from './controller.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

describe('prnSingleController', () => {
  test('renders the PRN view with the organisation, PRN and regulator details', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = { id: 'prn-1', number: 'PRN123', status: 'Accepted' }
    const request = {
      params: { organisationId },
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
      '_shared/prns/views/prn',
      expect.objectContaining({
        organisationId,
        organisationName: 'Example Operator Ltd',
        year: 2026,
        prn,
        backLink: `/producer/${organisationId}/prns?year=2026`,
        regulatorName: expectedRegulator.nameWithArticle,
        regulatorEmail: expectedRegulator.email,
        regulation43Url: REGULATION_43_URL
      })
    )
    expect(model.organisationId).toBe(organisationId)
  })

  test('passes isStatusEditable from the shared PRN status rule', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }

    const awaiting = await prnSingleController.handler(
      {
        params: { organisationId },
        query: { year: 2026 },
        pre: {
          organisation: { name: 'Example Operator Ltd' },
          prn: { id: 'p', status: 'AwaitingAcceptance' }
        }
      },
      h
    )
    expect(awaiting.model.isStatusEditable).toBe(true)

    const accepted = await prnSingleController.handler(
      {
        params: { organisationId },
        query: { year: 2026 },
        pre: {
          organisation: { name: 'Example Operator Ltd' },
          prn: { id: 'p', status: 'Accepted' }
        }
      },
      h
    )
    expect(accepted.model.isStatusEditable).toBe(false)
  })

  test('links the accept button to the confirm-accept page, prefixed for a reverse proxy', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { organisationId, prnId: 'prn-1' },
      query: { year: 2026 },
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' },
      pre: {
        organisation: { name: 'Example Operator Ltd' },
        prn: { id: 'prn-1', status: 'AwaitingAcceptance' }
      }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.gotoPrnConfirmAccept).toBe(
      `/manage-recycling-obligations/producer/${organisationId}/prns/prn-1/confirm-accept?year=2026`
    )
  })

  test('links the obligations button to the producer obligations home page, prefixed for a reverse proxy', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { organisationId, prnId: 'prn-1' },
      query: { year: 2026 },
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' },
      pre: {
        organisation: { name: 'Example Operator Ltd' },
        prn: { id: 'prn-1', status: 'Accepted' }
      }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.obligationsLink).toBe(
      `/manage-recycling-obligations/producer/${organisationId}/obligations?year=2026`
    )
  })

  test('shows the obligations link when the manageObligations feature flag is enabled', async () => {
    const previous = config.get('features.manageObligations')
    config.set('features.manageObligations', true)

    try {
      const h = { view: vi.fn((_viewName, model) => ({ model })) }
      const request = {
        params: { organisationId, prnId: 'prn-1' },
        query: { year: 2026 },
        pre: {
          organisation: { name: 'Example Operator Ltd' },
          prn: { id: 'prn-1', status: 'Accepted' }
        }
      }

      const { model } = await prnSingleController.handler(request, h)

      expect(model.showObligationsLink).toBe(true)
    } finally {
      config.set('features.manageObligations', previous)
    }
  })

  test('hides the obligations link when the manageObligations feature flag is disabled', async () => {
    const previous = config.get('features.manageObligations')
    config.set('features.manageObligations', false)

    try {
      const h = { view: vi.fn((_viewName, model) => ({ model })) }
      const request = {
        params: { organisationId, prnId: 'prn-1' },
        query: { year: 2026 },
        pre: {
          organisation: { name: 'Example Operator Ltd' },
          prn: { id: 'prn-1', status: 'Accepted' }
        }
      }

      const { model } = await prnSingleController.handler(request, h)

      expect(model.showObligationsLink).toBe(false)
    } finally {
      config.set('features.manageObligations', previous)
    }
  })

  test('hides the obligations link when no year is resolved, even if the manageObligations feature flag is enabled', async () => {
    const previous = config.get('features.manageObligations')
    config.set('features.manageObligations', true)

    try {
      const h = { view: vi.fn((_viewName, model) => ({ model })) }
      const request = {
        params: { organisationId, prnId: 'prn-1' },
        query: {},
        pre: {
          organisation: { name: 'Example Operator Ltd' },
          prn: { id: 'prn-1', status: 'Accepted' }
        }
      }

      const { model } = await prnSingleController.handler(request, h)

      expect(model.year).toBeUndefined()
      expect(model.showObligationsLink).toBe(false)
    } finally {
      config.set('features.manageObligations', previous)
    }
  })

  test('uses the PRN obligation year for display, but keeps the browsed query year for the back link', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = { id: 'prn-1', number: 'PRN123', obligationYear: 2024 }
    const request = {
      params: { organisationId },
      query: { year: 2026 },
      pre: { organisation: { name: 'Example Operator Ltd' }, prn }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.year).toBe(2024)
    expect(model.backLink).toBe(`/producer/${organisationId}/prns?year=2026`)
  })

  test('keeps the obligations link on the resolved PRN year even when it differs from the query year', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = {
      id: 'prn-1',
      number: 'PRN123',
      status: 'Accepted',
      obligationYear: 2024
    }
    const request = {
      params: { organisationId },
      query: { year: 2026 },
      pre: { organisation: { name: 'Example Operator Ltd' }, prn }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.obligationsLink).toBe(
      `/producer/${organisationId}/obligations?year=2024`
    )
  })

  test('keeps the accept-or-reject-more link on the resolved PRN year, independent of the back link', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = {
      id: 'prn-1',
      number: 'PRN123',
      status: 'Accepted',
      obligationYear: 2024
    }
    const request = {
      params: { organisationId },
      query: { year: 2026 },
      pre: { organisation: { name: 'Example Operator Ltd' }, prn }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.acceptOrRejectMoreLink).toBe(
      `/producer/${organisationId}/prns?year=2024`
    )
    expect(model.backLink).toBe(`/producer/${organisationId}/prns?year=2026`)
  })

  test('sets the back link to the PRNs list page', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { organisationId },
      query: { year: 2026 },
      pre: { organisation: { name: 'Example Operator Ltd' }, prn: { id: 'p' } }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.backLink).toBe(`/producer/${organisationId}/prns?year=2026`)
  })

  test('prefixes the back link with the X-Forwarded-Prefix from a reverse proxy', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { organisationId },
      query: { year: 2026 },
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' },
      pre: { organisation: { name: 'Example Operator Ltd' }, prn: { id: 'p' } }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.backLink).toBe(
      `/manage-recycling-obligations/producer/${organisationId}/prns?year=2026`
    )
  })

  test('ignores an invalid X-Forwarded-Prefix header', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { organisationId },
      query: { year: 2026 },
      headers: { 'x-forwarded-prefix': '//evil.example/path' },
      pre: { organisation: { name: 'Example Operator Ltd' }, prn: { id: 'p' } }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.backLink).toBe(`/producer/${organisationId}/prns?year=2026`)
  })

  test('falls back to the default regulator when the organisation is missing', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = { id: 'prn-2', number: 'PRN456', status: 'Rejected' }
    const request = {
      params: { organisationId },
      query: { year: 2025 },
      pre: { prn }
    }

    const { model } = await prnSingleController.handler(request, h)

    const expectedRegulator = getRegulatorDetails(undefined, 'en')

    expect(model.organisationName).toBeUndefined()
    expect(model.regulatorName).toBe(expectedRegulator.nameWithArticle)
    expect(model.regulatorEmail).toBe(expectedRegulator.email)
  })

  test('is configured as a GET route under /producer/{organisationId}/prns/{prnId}', () => {
    expect(prnSingleController.method).toBe('GET')
    expect(prnSingleController.path).toBe(
      '/producer/{organisationId}/prns/{prnId}'
    )
  })

  test('reuses the shared PRN route options', () => {
    expect(prnSingleController.options.validate).toBe(prnRouteOptions.validate)
  })

  test('runs currentOrganisation and approvedUser before loading the organisation and PRN', () => {
    expect(prnSingleController.options.pre).toEqual([
      currentOrganisation,
      approvedUser,
      complianceMiddlewares.organisation,
      producerPrnMiddlewares.prn
    ])
  })

  test('exports the controller as the only route', () => {
    expect(prnRoutes).toEqual([prnSingleController])
  })
})
