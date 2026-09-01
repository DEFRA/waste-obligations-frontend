import { describe, expect, test, vi } from 'vitest'

import Boom from '@hapi/boom'
import { ApiError } from '#/server/services/base/api-error.js'
import { csoPrnPath, producerPrnPath } from './organisations-paths.js'
import { organisationsPrnRouteOptions } from './organisations-route-options.js'
import { buildPrnConfirmAcceptRoutes } from './prn-confirm-accept-routes.js'

const id = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const prnId = 'f2b1c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d'

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'test.user@example.com',
  firstName: 'Test',
  lastName: 'User'
}

const journeys = [
  {
    label: 'producer',
    paramKey: 'organisationId',
    path: '/organisations/producer/{organisationId}/prns/{prnId}/confirm-accept',
    prnPath: producerPrnPath,
    prnBase: `/organisations/producer/${id}/prns/${prnId}`
  },
  {
    label: 'CSO',
    paramKey: 'schemeId',
    path: '/organisations/cso/{schemeId}/prns/{prnId}/confirm-accept',
    prnPath: csoPrnPath,
    prnBase: `/organisations/cso/${id}/prns/${prnId}`
  }
]

describe.each(journeys)(
  'buildPrnConfirmAcceptRoutes ($label)',
  ({ paramKey, path, prnPath, prnBase }) => {
    const pre = [vi.fn(), vi.fn()]
    const [getController, postController] = buildPrnConfirmAcceptRoutes({
      path,
      paramKey,
      pre,
      prnPath
    })

    function buildRequest(overrides = {}) {
      return {
        params: { [paramKey]: id, prnId },
        query: { year: 2026 },
        yar: { get: vi.fn((key) => (key === 'user' ? user : undefined)) },
        logger: { error: vi.fn(), warn: vi.fn() },
        pre: {
          prn: {
            id: prnId,
            tonnage: 25,
            material: 'Plastic',
            type: 'PRN',
            obligationYear: 2026
          }
        },
        server: {
          app: {
            wasteObligationsApi: {
              updatePrnStatus: vi.fn().mockResolvedValue(null)
            }
          }
        },
        ...overrides
      }
    }

    test('GET and POST share the confirm path, pre list and shared route options', () => {
      expect(getController.method).toBe('GET')
      expect(postController.method).toBe('POST')
      expect(getController.path).toBe(path)
      expect(postController.path).toBe(path)
      expect(getController.options.pre).toBe(pre)
      expect(postController.options.pre).toBe(pre)
      expect(getController.options.validate).toBe(
        organisationsPrnRouteOptions.validate
      )
    })

    describe('GET', () => {
      test('renders the confirm view with the PRN, authoritative obligation year and go-back link', async () => {
        const h = { view: vi.fn((_view, model) => ({ model })) }
        const request = buildRequest()

        const { model } = await getController.handler(request, h)

        expect(h.view).toHaveBeenCalledWith(
          'organisations/views/prn-confirm-accept',
          expect.objectContaining({
            [paramKey]: id,
            prnId,
            obligationYear: 2026,
            prn: request.pre.prn,
            goBackHref: `${prnBase}?year=2026`
          })
        )
        // tonnage/material are read off `prn` in the template, not duplicated;
        // `year` (the resolved fallback) is not surfaced as fact in the copy
        expect(model).not.toHaveProperty('tonnage')
        expect(model).not.toHaveProperty('material')
        expect(model).not.toHaveProperty('year')
        expect(model.prnId).toBe(prnId)
      })

      test('passes obligationYear undefined (never a guess) when the PRN has no obligation year', async () => {
        const h = { view: vi.fn((_view, model) => ({ model })) }
        const request = buildRequest({
          query: { year: 2026 },
          pre: { prn: { id: prnId, tonnage: 25, material: 'Plastic' } }
        })

        const { model } = await getController.handler(request, h)

        expect(model.obligationYear).toBeUndefined()
        // the back-link URL still carries the resolved year
        expect(model.goBackHref).toBe(`${prnBase}?year=2026`)
      })

      test('prefixes goBackHref with the X-Forwarded-Prefix from a reverse proxy', async () => {
        const h = { view: vi.fn((_view, model) => ({ model })) }
        const request = buildRequest({
          headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
        })

        const { model } = await getController.handler(request, h)

        expect(model.goBackHref).toBe(
          `/manage-recycling-obligations${prnBase}?year=2026`
        )
      })

      test('uses the PRN obligation year for the copy and the back link when the query year is missing', async () => {
        const h = { view: vi.fn((_view, model) => ({ model })) }
        const request = buildRequest({
          query: {},
          pre: { prn: { id: prnId, obligationYear: 2024, tonnage: 25 } }
        })

        const { model } = await getController.handler(request, h)

        expect(model.obligationYear).toBe(2024)
        expect(model.goBackHref).toBe(`${prnBase}?year=2024`)
      })

      test('redirects to the PRN page without rendering when the PRN is not editable', async () => {
        const h = {
          view: vi.fn(),
          redirect: vi.fn((location) => ({ location }))
        }
        const request = buildRequest({
          query: {},
          pre: { prn: { id: prnId, status: 'Accepted', obligationYear: 2024 } }
        })

        const { location } = await getController.handler(request, h)

        expect(location).toBe(`${prnBase}?year=2024`)
        expect(h.view).not.toHaveBeenCalled()
      })
    })

    describe('POST', () => {
      test('patches the PRN status to ACCEPTED with the current user then redirects to the PRN page', async () => {
        const request = buildRequest()
        const h = { redirect: vi.fn((location) => ({ location })) }

        const { location } = await postController.handler(request, h)

        expect(
          request.server.app.wasteObligationsApi.updatePrnStatus
        ).toHaveBeenCalledWith(id, prnId, {
          status: 'ACCEPTED',
          user: {
            id: user.id,
            email: user.email,
            name: 'Test User',
            locale: 'en'
          }
        })
        expect(location).toBe(`${prnBase}?year=2026`)
      })

      test('redirects with the resolved obligation year when no year query is present', async () => {
        const request = buildRequest({
          query: {},
          pre: { prn: { id: prnId, tonnage: 25, obligationYear: 2024 } }
        })
        const h = { redirect: vi.fn((location) => ({ location })) }

        const { location } = await postController.handler(request, h)

        expect(location).toBe(`${prnBase}?year=2024`)
      })

      test('does not submit and redirects when the PRN is not editable', async () => {
        const request = buildRequest({
          pre: { prn: { id: prnId, status: 'Rejected' } }
        })
        const h = { redirect: vi.fn((location) => ({ location })) }

        const { location } = await postController.handler(request, h)

        expect(
          request.server.app.wasteObligationsApi.updatePrnStatus
        ).not.toHaveBeenCalled()
        expect(location).toBe(`${prnBase}?year=2026`)
      })

      test('redirects to the PRN page (not a 500) when the API rejects a stale accept with a 4xx', async () => {
        const request = buildRequest()
        request.server.app.wasteObligationsApi.updatePrnStatus.mockRejectedValue(
          new ApiError({ status: 409, message: 'already accepted' })
        )
        const h = { redirect: vi.fn((location) => ({ location })) }

        const { location } = await postController.handler(request, h)

        expect(location).toBe(`${prnBase}?year=2026`)
      })

      test('throws a 500 when the PRN status update fails upstream', async () => {
        const request = buildRequest()
        request.server.app.wasteObligationsApi.updatePrnStatus.mockRejectedValue(
          new Error('upstream down')
        )
        const h = { redirect: vi.fn() }

        await expect(postController.handler(request, h)).rejects.toThrow(
          Boom.badImplementation().message
        )
        expect(request.logger.error).toHaveBeenCalled()
        expect(h.redirect).not.toHaveBeenCalled()
      })
    })
  }
)
