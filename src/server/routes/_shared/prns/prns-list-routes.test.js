import { describe, expect, test, vi } from 'vitest'

import { prnsRouteOptions } from './prns-route-options.js'
import { prnsListPayloadSchema } from './schema.js'
import { SELECTED_PRNS_FIELD_ID } from './selected-prns-validation.js'
import { buildPrnsListRoutes } from './prns-list-routes.js'

const id = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const prnId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'
const nowSpyDate = new Date('2026-06-15T12:00:00Z')
const errorMessage =
  'To accept multiple PRNs or PERNs select one or more using the check boxes'

const journeys = [
  {
    label: 'producer',
    paramKey: 'organisationId',
    path: '/producer/{organisationId}/prns',
    userType: 'producer',
    prnHref: `/producer/${id}/prns/${prnId}?year=2026`
  },
  {
    label: 'CSO',
    paramKey: 'schemeId',
    path: '/cso/{schemeId}/prns',
    userType: 'cso',
    prnHref: `/cso/${id}/prns/${prnId}?year=2026`
  }
]

function buildPrn(overrides = {}) {
  return {
    id: prnId,
    number: 'PRN123',
    type: 'PRN',
    status: 'AwaitingAcceptance',
    material: 'Plastic',
    tonnage: 75,
    obligationYear: 2026,
    decemberWaste: false,
    issuedAt: '2026-04-02',
    issuer: { organisationName: 'Reprocessor Ltd' },
    additionalNotes: 'PO 1',
    ...overrides
  }
}

describe.each(journeys)(
  'buildPrnsListRoutes ($label)',
  ({ paramKey, path, userType, prnHref }) => {
    const pre = [vi.fn(), vi.fn()]
    const [getController, postController] = buildPrnsListRoutes({
      path,
      paramKey,
      userType,
      pre
    })

    function buildRequest({
      prns,
      total = prns.length,
      page = 1,
      pageSize = 20,
      query = {},
      headers,
      payload
    } = {}) {
      return {
        params: { [paramKey]: id },
        query,
        headers,
        payload,
        app: {},
        pre: {
          organisation: { name: 'Example Operator Ltd' },
          prns: { prns, total, page, pageSize }
        }
      }
    }

    test('GET and POST share the list path and pre list', () => {
      expect(getController.method).toBe('GET')
      expect(postController.method).toBe('POST')
      expect(getController.path).toBe(path)
      expect(postController.path).toBe(path)
      expect(getController.options.pre).toBe(pre)
      expect(postController.options.pre).toBe(pre)
      expect(getController.options.validate).toBe(prnsRouteOptions.validate)
      expect(postController.options.validate.payload).toBe(
        prnsListPayloadSchema
      )
    })

    describe('GET', () => {
      test('renders the awaiting-acceptance table for the year', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = { view: vi.fn((_viewName, model) => ({ model })) }
        const request = buildRequest({
          prns: [buildPrn()],
          query: { year: 2026 }
        })

        const { model } = await getController.handler(request, h)

        expect(h.view).toHaveBeenCalledWith('_shared/prns/views/prns', model)
        expect(model[paramKey]).toBe(id)
        expect(model.year).toBe(2026)
        expect(model.formErrors).toBeNull()
        expect(model.prnsViewModel.showAcceptSelectedButton).toBe(true)
        expect(model.prnsViewModel.rows[0].number.html).toContain('PRN123')
        expect(model.prnsViewModel.rows[0].number.html).toContain(prnHref)

        vi.useRealTimers()
      })

      test('prefixes PRN detail links with the X-Forwarded-Prefix', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = { view: vi.fn((_viewName, model) => ({ model })) }
        const request = buildRequest({
          prns: [buildPrn()],
          query: { year: 2026 },
          headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
        })

        const { model } = await getController.handler(request, h)

        expect(model.prnsViewModel.rows[0].number.html).toContain(
          `href="/manage-recycling-obligations${prnHref}"`
        )

        vi.useRealTimers()
      })

      test('omits the page year when the query year is missing', async () => {
        const h = { view: vi.fn((_viewName, model) => ({ model })) }
        const request = buildRequest({ prns: [] })

        const { model } = await getController.handler(request, h)

        expect(model.year).toBeUndefined()
        expect(model.formErrors).toBeNull()
      })

      test('builds pagination when the total spans more than one page', async () => {
        const h = { view: vi.fn((_viewName, model) => ({ model })) }
        const request = buildRequest({
          prns: [buildPrn()],
          total: 25,
          pageSize: 20,
          query: { year: 2026 }
        })

        const { model } = await getController.handler(request, h)

        expect(model.prnsViewModel.pagination).not.toBeNull()
      })
    })

    describe('POST', () => {
      test('shows the error summary when no PRNs are selected', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = { view: vi.fn((_viewName, model) => ({ model })) }
        const request = buildRequest({
          prns: [buildPrn()],
          query: { year: 2026 },
          payload: { selectedPrnIds: [] }
        })

        const { model } = await postController.handler(request, h)

        expect(h.view).toHaveBeenCalledWith('_shared/prns/views/prns', model)
        expect(model.formErrors).toEqual({
          summary: [
            {
              text: errorMessage,
              href: `#${SELECTED_PRNS_FIELD_ID}`
            }
          ]
        })
        expect(model.prnsViewModel.showAcceptSelectedButton).toBe(true)

        vi.useRealTimers()
      })

      test('does not show the error summary when at least one PRN is selected', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = { view: vi.fn((_viewName, model) => ({ model })) }
        const request = buildRequest({
          prns: [buildPrn()],
          query: { year: 2026 },
          payload: { selectedPrnIds: [prnId] }
        })

        const { model } = await postController.handler(request, h)

        expect(model.formErrors).toBeNull()
        expect(model.year).toBe(2026)

        vi.useRealTimers()
      })
    })
  }
)
