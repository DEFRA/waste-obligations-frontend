import { describe, expect, test, vi } from 'vitest'

import { csoPrnPath, producerPrnPath } from './prns-paths.js'
import { prnRouteOptions } from './prns-route-options.js'
import { buildPrnConfirmRejectRoutes } from './prn-confirm-reject-routes.js'

const id = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const prnId = 'f2b1c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d'

const journeys = [
  {
    label: 'producer',
    paramKey: 'organisationId',
    path: '/producer/{organisationId}/prns/{prnId}/confirm-reject',
    prnPath: producerPrnPath,
    prnBase: `/producer/${id}/prns/${prnId}`
  },
  {
    label: 'CSO',
    paramKey: 'schemeId',
    path: '/cso/{schemeId}/prns/{prnId}/confirm-reject',
    prnPath: csoPrnPath,
    prnBase: `/cso/${id}/prns/${prnId}`
  }
]

describe.each(journeys)(
  'buildPrnConfirmRejectRoutes ($label)',
  ({ paramKey, path, prnPath, prnBase }) => {
    const pre = [vi.fn(), vi.fn()]
    const [getController] = buildPrnConfirmRejectRoutes({
      path,
      paramKey,
      pre,
      prnPath
    })

    function buildRequest(overrides = {}) {
      return {
        params: { [paramKey]: id, prnId },
        query: { year: 2026 },
        pre: {
          prn: {
            id: prnId,
            type: 'PRN',
            status: 'AwaitingAcceptance'
          }
        },
        ...overrides
      }
    }

    test('exposes a GET route on the confirm path with the shared route options', () => {
      expect(getController.method).toBe('GET')
      expect(getController.path).toBe(path)
      expect(getController.options.pre).toBe(pre)
      expect(getController.options.validate).toBe(prnRouteOptions.validate)
    })

    test('renders the confirm view with the PRN and go-back link', () => {
      const h = { view: vi.fn((_view, model) => ({ model })) }
      const request = buildRequest()

      const { model } = getController.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        '_shared/prns/views/prn-confirm-reject',
        expect.objectContaining({
          [paramKey]: id,
          prnId,
          prn: request.pre.prn,
          backLink: `${prnBase}?year=2026`,
          goBackHref: `${prnBase}?year=2026`
        })
      )
      expect(model.prnId).toBe(prnId)
    })

    test('prefixes backLink and goBackHref with the X-Forwarded-Prefix from a reverse proxy', () => {
      const h = { view: vi.fn((_view, model) => ({ model })) }
      const request = buildRequest({
        headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
      })

      const { model } = getController.handler(request, h)

      const prefixedPrnHref = `/manage-recycling-obligations${prnBase}?year=2026`

      expect(model.backLink).toBe(prefixedPrnHref)
      expect(model.goBackHref).toBe(prefixedPrnHref)
    })

    test('redirects to the PRN page without rendering when the PRN is not editable', () => {
      const h = {
        view: vi.fn(),
        redirect: vi.fn((location) => ({ location }))
      }
      const request = buildRequest({
        pre: { prn: { id: prnId, status: 'Accepted' } }
      })

      const { location } = getController.handler(request, h)

      expect(location).toBe(`${prnBase}?year=2026`)
      expect(h.view).not.toHaveBeenCalled()
    })
  }
)
