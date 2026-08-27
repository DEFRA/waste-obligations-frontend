import { describe, expect, test, vi } from 'vitest'

import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import * as complianceMiddlewares from '#/server/routes/compliance/_middlewares/index.js'
import * as organisationsMiddlewares from '#/server/routes/organisations/_middlewares/index.js'
import { organisationPrnsRouteOptions } from '../_shared/organisations-route-options.js'
import { prnsListController, prnsListRoutes } from './controller.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

function buildRequest({ prns, query = {} } = {}) {
  return {
    params: { organisationId },
    query,
    pre: {
      organisation: { name: 'Example Operator Ltd' },
      prns: { prns, total: prns.length, page: 1, pageSize: 20 }
    }
  }
}

describe('prnsListController', () => {
  test('renders the PRNs table with a fully populated row', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = {
      id: 'prn-1',
      number: 'PRN123',
      type: 'PRN',
      status: 'Accepted',
      material: 'Plastic',
      tonnage: 75,
      obligationYear: 2026,
      issuedAt: '2026-04-02',
      issuer: { organisationName: 'Reprocessor Ltd' }
    }
    const request = buildRequest({ prns: [prn] })

    const { model } = await prnsListController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'organisations/prns/index',
      expect.objectContaining({
        organisationId,
        organisationName: 'Example Operator Ltd',
        prns: [prn],
        total: 1,
        page: 1,
        pageSize: 20
      })
    )
    expect(model.prnsTable.classes).toBe('app-prns-table')
    expect(model.prnsTable.head.map((cell) => cell.text)).toEqual([
      'Number',
      'Type',
      'Status',
      'Material',
      'Tonnage',
      'Date issued',
      'Issuer',
      'View'
    ])
    expect(model.prnsTable.rows).toEqual([
      [
        { text: 'PRN123' },
        { text: 'PRN' },
        { text: 'Accepted' },
        { text: 'Plastic' },
        { text: 75 },
        { text: '02 Apr 2026' },
        { text: 'Reprocessor Ltd' },
        {
          html: `<a class="govuk-link" href="/organisations/${organisationId}/prns/prn-1?year=2026">View</a>`
        }
      ]
    ])
  })

  test('falls back to the raw status and blank fields when data is missing', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = {
      id: 'prn-2',
      number: 'PRN456',
      type: 'PERN',
      status: 'SomeUnmappedStatus',
      material: 'Glass',
      tonnage: 10,
      obligationYear: 2025,
      issuedAt: null,
      issuer: null
    }
    const request = buildRequest({ prns: [prn] })

    const { model } = await prnsListController.handler(request, h)

    const [row] = model.prnsTable.rows

    expect(row[2]).toEqual({ text: 'SomeUnmappedStatus' })
    expect(row[5]).toEqual({ text: '' })
    expect(row[6]).toEqual({ text: '' })
  })

  test('is configured as a GET route under /organisations/{organisationId}/prns', () => {
    expect(prnsListController.method).toBe('GET')
    expect(prnsListController.path).toBe('/organisations/{organisationId}/prns')
  })

  test('reuses the shared organisation PRNs route options', () => {
    expect(prnsListController.options.validate).toBe(
      organisationPrnsRouteOptions.validate
    )
  })

  test('runs currentOrganisation and approvedUser before loading the organisation and PRNs', () => {
    expect(prnsListController.options.pre).toEqual([
      currentOrganisation,
      approvedUser,
      complianceMiddlewares.organisation,
      organisationsMiddlewares.prns
    ])
  })

  test('exports the controller as the only route', () => {
    expect(prnsListRoutes).toEqual([prnsListController])
  })
})
