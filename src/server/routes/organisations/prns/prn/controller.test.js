import { describe, expect, test, vi } from 'vitest'

import { REGULATION_43_URL } from '#/config/constants.js'
import { getRegulatorDetails } from '#/server/routes/compliance/_shared/regulator.js'
import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import * as complianceMiddlewares from '#/server/routes/compliance/_middlewares/index.js'
import * as organisationsMiddlewares from '#/server/routes/organisations/_middlewares/index.js'
import { organisationsRouteOptions } from '../../_shared/organisations-route-options.js'
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
      'organisations/prns/prn/index',
      expect.objectContaining({
        organisationId,
        organisationName: 'Example Operator Ltd',
        year: 2026,
        prn,
        regulatorName: expectedRegulator.nameWithArticle,
        regulatorEmail: expectedRegulator.email,
        regulation43Url: REGULATION_43_URL
      })
    )
    expect(model.organisationId).toBe(organisationId)
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

  test('is configured as a GET route under /organisations/{organisationId}/prns/{prnId}', () => {
    expect(prnSingleController.method).toBe('GET')
    expect(prnSingleController.path).toBe(
      '/organisations/{organisationId}/prns/{prnId}'
    )
  })

  test('reuses the shared organisations route options', () => {
    expect(prnSingleController.options.validate).toBe(
      organisationsRouteOptions.validate
    )
  })

  test('runs currentOrganisation and approvedUser before loading the organisation and PRN', () => {
    expect(prnSingleController.options.pre).toEqual([
      currentOrganisation,
      approvedUser,
      complianceMiddlewares.organisation,
      organisationsMiddlewares.prn
    ])
  })

  test('exports the controller as the only route', () => {
    expect(prnRoutes).toEqual([prnSingleController])
  })
})
