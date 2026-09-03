import { describe, expect, test, vi } from 'vitest'

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
        backLink: `/producer/${organisationId}/prns`,
        regulatorName: expectedRegulator.nameWithArticle,
        regulatorEmail: expectedRegulator.email,
        regulation43Url: REGULATION_43_URL
      })
    )
    expect(model.organisationId).toBe(organisationId)
  })

  test('falls back to the PRN obligation year when the query year is missing', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = { id: 'prn-1', number: 'PRN123', obligationYear: 2024 }
    const request = {
      params: { organisationId },
      query: {},
      pre: { organisation: { name: 'Example Operator Ltd' }, prn }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.year).toBe(2024)
  })

  test('falls back to the current year when neither query nor PRN has a year', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { organisationId },
      query: {},
      pre: { organisation: { name: 'Example Operator Ltd' }, prn: { id: 'p' } }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.year).toBe(new Date().getFullYear())
  })

  test('sets the back link to the PRNs list page', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = {
      params: { organisationId },
      query: { year: 2026 },
      pre: { organisation: { name: 'Example Operator Ltd' }, prn: { id: 'p' } }
    }

    const { model } = await prnSingleController.handler(request, h)

    expect(model.backLink).toBe(`/producer/${organisationId}/prns`)
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
      `/manage-recycling-obligations/producer/${organisationId}/prns`
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

    expect(model.backLink).toBe(`/producer/${organisationId}/prns`)
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
