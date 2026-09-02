import { describe, expect, test, vi } from 'vitest'

import { currentComplianceScheme } from '#/server/routes/_shared/compliance/_middlewares/current-compliance-scheme.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import * as complianceMiddlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import * as csoPrnMiddlewares from '#/server/routes/cso/_middlewares/index.js'
import { prnsRouteOptions } from '#/server/routes/_shared/prns/prns-route-options.js'
import { prnsListController, prnsListRoutes } from './controller.js'

const schemeId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

function buildRequest({ prns, query = {}, headers } = {}) {
  return {
    params: { schemeId },
    query,
    headers,
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

    expect(h.view).toHaveBeenCalledWith('_shared/prns/views/prns', model)
    expect(model.prnsViewModel.classes).toBe('app-prns-table')
    expect(model.prnsViewModel.columns).toEqual([
      { key: 'number', heading: 'Number' },
      { key: 'type', heading: 'Type' },
      { key: 'status', heading: 'Status' },
      { key: 'material', heading: 'Material' },
      { key: 'tonnage', heading: 'Tonnage' },
      { key: 'issuedAt', heading: 'Date issued' },
      { key: 'issuer', heading: 'Issuer' },
      { key: 'view', heading: 'View' }
    ])
    expect(model.prnsViewModel.rows).toEqual([
      {
        number: { text: 'PRN123' },
        type: { text: 'PRN' },
        status: { text: 'Accepted' },
        material: { text: 'Plastic' },
        tonnage: { text: 75 },
        issuedAt: { text: '02 Apr 2026' },
        issuer: { text: 'Reprocessor Ltd' },
        view: {
          html: `<a class="govuk-link" href="/cso/${schemeId}/prns/prn-1?year=2026">View</a>`
        }
      }
    ])
  })

  test('prefixes the row view links with the X-Forwarded-Prefix from a reverse proxy', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = { id: 'prn-1', number: 'PRN123', obligationYear: 2026 }
    const request = buildRequest({
      prns: [prn],
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
    })

    const { model } = await prnsListController.handler(request, h)

    expect(model.prnsViewModel.rows[0].view.html).toContain(
      `href="/manage-recycling-obligations/cso/${schemeId}/prns/prn-1?year=2026"`
    )
  })

  test('ignores an invalid X-Forwarded-Prefix header on the row view links', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = { id: 'prn-1', number: 'PRN123', obligationYear: 2026 }
    const request = buildRequest({
      prns: [prn],
      headers: { 'x-forwarded-prefix': '//evil.example/path' }
    })

    const { model } = await prnsListController.handler(request, h)

    expect(model.prnsViewModel.rows[0].view.html).toContain(
      `href="/cso/${schemeId}/prns/prn-1?year=2026"`
    )
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

    const [row] = model.prnsViewModel.rows

    expect(row.status).toEqual({ text: 'SomeUnmappedStatus' })
    expect(row.issuedAt).toEqual({ text: '' })
    expect(row.issuer).toEqual({ text: '' })
  })

  test('is configured as a GET route under /cso/{schemeId}/prns', () => {
    expect(prnsListController.method).toBe('GET')
    expect(prnsListController.path).toBe('/cso/{schemeId}/prns')
  })

  test('reuses the shared PRNs route options', () => {
    expect(prnsListController.options.validate).toBe(prnsRouteOptions.validate)
  })

  test('runs currentComplianceScheme and approvedUser before loading the organisation and PRNs', () => {
    expect(prnsListController.options.pre).toEqual([
      currentComplianceScheme,
      approvedUser,
      complianceMiddlewares.organisation,
      csoPrnMiddlewares.prns
    ])
  })

  test('exports the controller as the only route', () => {
    expect(prnsListRoutes).toEqual([prnsListController])
  })
})
