import { describe, expect, test, vi } from 'vitest'

import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import * as complianceMiddlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import * as producerPrnMiddlewares from '#/server/routes/producer/_middlewares/index.js'
import { prnsRouteOptions } from '#/server/routes/_shared/prns/prns-route-options.js'
import { prnsListController, prnsListRoutes } from './controller.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const nowSpyDate = new Date('2026-06-15T12:00:00Z')

function buildRequest({ prns, query = {}, headers } = {}) {
  return {
    params: { organisationId },
    query,
    headers,
    app: {},
    pre: {
      organisation: { name: 'Example Operator Ltd' },
      prns: { prns, total: prns.length, page: 1, pageSize: 20 }
    }
  }
}

describe('prnsListController', () => {
  test('renders the awaiting-acceptance table for the organisation year', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSpyDate)

    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = {
      id: 'prn-1',
      number: 'PRN123',
      type: 'PRN',
      status: 'AwaitingAcceptance',
      material: 'Plastic',
      tonnage: 75,
      obligationYear: 2026,
      decemberWaste: false,
      issuedAt: '2026-04-02',
      issuer: { organisationName: 'Reprocessor Ltd' },
      additionalNotes: 'PO 1'
    }
    const request = buildRequest({ prns: [prn], query: { year: 2026 } })

    const { model } = await prnsListController.handler(request, h)

    expect(h.view).toHaveBeenCalledWith('_shared/prns/views/prns', model)
    expect(model.year).toBe(2026)
    expect(model.prnsViewModel.showAcceptSelectedButton).toBe(true)
    expect(model.prnsViewModel.rows[0].number.html).toContain('PRN123')
    expect(model.prnsViewModel.rows[0].number.html).toContain(
      `/producer/${organisationId}/prns/prn-1?year=2026`
    )

    vi.useRealTimers()
  })

  test('prefixes PRN detail links with the X-Forwarded-Prefix', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(nowSpyDate)

    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const prn = {
      id: 'prn-1',
      number: 'PRN123',
      obligationYear: 2026,
      decemberWaste: false,
      status: 'AwaitingAcceptance'
    }
    const request = buildRequest({
      prns: [prn],
      query: { year: 2026 },
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
    })

    const { model } = await prnsListController.handler(request, h)

    expect(model.prnsViewModel.rows[0].number.html).toContain(
      `href="/manage-recycling-obligations/producer/${organisationId}/prns/prn-1?year=2026"`
    )

    vi.useRealTimers()
  })

  test('omits the page year when the query year is missing', async () => {
    const h = { view: vi.fn((_viewName, model) => ({ model })) }
    const request = buildRequest({ prns: [] })

    const { model } = await prnsListController.handler(request, h)

    expect(model.year).toBeUndefined()
  })

  test('is configured as a GET route under /producer/{organisationId}/prns', () => {
    expect(prnsListController.method).toBe('GET')
    expect(prnsListController.path).toBe('/producer/{organisationId}/prns')
  })

  test('reuses the shared PRNs route options', () => {
    expect(prnsListController.options.validate).toBe(prnsRouteOptions.validate)
  })

  test('runs currentOrganisation and approvedUser before loading the organisation and PRNs', () => {
    expect(prnsListController.options.pre).toEqual([
      currentOrganisation,
      approvedUser,
      complianceMiddlewares.organisation,
      producerPrnMiddlewares.prns
    ])
  })

  test('exports the controller as the only route', () => {
    expect(prnsListRoutes).toEqual([prnsListController])
  })
})
