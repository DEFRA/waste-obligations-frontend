import { describe, expect, test, vi } from 'vitest'

import Boom from '@hapi/boom'
import { ApiError } from '#/server/services/base/api-error.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { csoPrnPath, producerPrnPath } from './prns-paths.js'
import { prnRouteOptions } from './prns-route-options.js'
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
    path: '/producer/{organisationId}/prns/{prnId}/confirm-accept',
    prnPath: producerPrnPath,
    prnBase: `/producer/${id}/prns/${prnId}`
  },
  {
    label: 'CSO',
    paramKey: 'schemeId',
    path: '/cso/{schemeId}/prns/{prnId}/confirm-accept',
    prnPath: csoPrnPath,
    prnBase: `/cso/${id}/prns/${prnId}`
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
            status: 'AwaitingAcceptance',
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
      expect(getController.options.validate).toBe(prnRouteOptions.validate)
    })

    describe('GET', () => {
      test('renders the confirm view with the PRN, authoritative obligation year and go-back link', async () => {
        const h = { view: vi.fn((_view, model) => ({ model })) }
        const request = buildRequest()

        const { model } = await getController.handler(request, h)

        expect(h.view).toHaveBeenCalledWith(
          '_shared/prns/views/prn-confirm-accept',
          expect.objectContaining({
            [paramKey]: id,
            prnId,
            obligationYear: 2026,
            prn: request.pre.prn,
            backLink: `${prnBase}?year=2026`,
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
          pre: {
            prn: {
              id: prnId,
              tonnage: 25,
              material: 'Plastic',
              status: 'AwaitingAcceptance'
            }
          }
        })

        const { model } = await getController.handler(request, h)

        expect(model.obligationYear).toBeUndefined()
        // the back-link URL still carries the resolved year
        expect(model.goBackHref).toBe(`${prnBase}?year=2026`)
      })

      test('prefixes backLink and goBackHref with the X-Forwarded-Prefix from a reverse proxy', async () => {
        const h = { view: vi.fn((_view, model) => ({ model })) }
        const request = buildRequest({
          headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
        })

        const { model } = await getController.handler(request, h)

        const prefixedPrnHref = `/manage-recycling-obligations${prnBase}?year=2026`

        expect(model.backLink).toBe(prefixedPrnHref)
        expect(model.goBackHref).toBe(prefixedPrnHref)
      })

      test('uses the PRN obligation year for the copy and the query year for the back link', async () => {
        const h = { view: vi.fn((_view, model) => ({ model })) }
        const request = buildRequest({
          query: { year: 2026 },
          pre: {
            prn: {
              id: prnId,
              obligationYear: 2024,
              tonnage: 25,
              status: 'AwaitingAcceptance'
            }
          }
        })

        const { model } = await getController.handler(request, h)

        expect(model.obligationYear).toBe(2024)
        expect(model.goBackHref).toBe(`${prnBase}?year=2026`)
      })

      test('redirects to the PRN page without rendering when the PRN is not editable', async () => {
        const h = {
          view: vi.fn(),
          redirect: vi.fn((location) => ({ location }))
        }
        const request = buildRequest({
          query: { year: 2026 },
          pre: { prn: { id: prnId, status: 'Accepted', obligationYear: 2024 } }
        })

        const { location } = await getController.handler(request, h)

        expect(location).toBe(`${prnBase}?year=2026`)
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
        expect(location).toBe(`${prnBase}?year=2026&confirmed=1`)
      })

      test('redirects with the query year even when it differs from the PRN obligation year', async () => {
        const request = buildRequest({
          query: { year: 2026 },
          pre: {
            prn: {
              id: prnId,
              tonnage: 25,
              obligationYear: 2024,
              status: 'AwaitingAcceptance'
            }
          }
        })
        const h = { redirect: vi.fn((location) => ({ location })) }

        const { location } = await postController.handler(request, h)

        expect(location).toBe(`${prnBase}?year=2026&confirmed=1`)
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

      test('redirects to the PRN page (not a 500) when the API rejects a stale accept with a conflict', async () => {
        const request = buildRequest()
        request.server.app.wasteObligationsApi.updatePrnStatus.mockRejectedValue(
          new ApiError({
            status: statusCodes.conflict,
            message: 'already accepted'
          })
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

describe('buildPrnConfirmAcceptRoutes for December waste', () => {
  const [getController, postController] = buildPrnConfirmAcceptRoutes({
    path: '/producer/{organisationId}/prns/{prnId}/confirm-accept',
    paramKey: 'organisationId',
    pre: [],
    prnPath: producerPrnPath,
    chooseYearPath: (orgId, id2, year) =>
      `/producer/${orgId}/prns/${id2}/choose-year?year=${year}`
  })

  const chooseYearHref = `/producer/${id}/prns/${prnId}/choose-year?year=2026`

  const decemberPrn = {
    id: prnId,
    tonnage: 25,
    material: 'Plastic',
    type: 'PRN',
    status: 'AwaitingAcceptance',
    obligationYear: 2026,
    decemberWaste: true
  }

  function buildRequest({ query, prn = decemberPrn }) {
    return {
      params: { organisationId: id, prnId },
      query,
      headers: {},
      yar: { get: vi.fn(() => user) },
      logger: { error: vi.fn(), warn: vi.fn() },
      pre: { prn },
      server: {
        app: {
          wasteObligationsApi: {
            updatePrnStatus: vi.fn().mockResolvedValue(null)
          }
        }
      }
    }
  }

  async function run(controller, now, request) {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(now))

    try {
      const h = {
        view: vi.fn((_view, model) => ({ model })),
        redirect: vi.fn((location) => ({ location }))
      }

      return { request, h, result: await controller.handler(request, h) }
    } finally {
      vi.useRealTimers()
    }
  }

  const DEC_2026 = '2026-12-15T12:00:00Z'
  const MAR_2027 = '2027-03-15T12:00:00Z'

  function sentPayload(request) {
    return request.server.app.wasteObligationsApi.updatePrnStatus.mock
      .calls[0]?.[2]
  }

  describe('with a choice of years (December)', () => {
    test('GET shows the chosen year and links back to the choose-year page', async () => {
      const { result } = await run(
        getController,
        DEC_2026,
        buildRequest({ query: { year: 2026, acceptYear: '2027' } })
      )

      expect(result.model.obligationYear).toBe(2027)
      expect(result.model.backLink).toBe(chooseYearHref)
      expect(result.model.goBackHref).toBe(
        `/producer/${id}/prns/${prnId}?year=2026`
      )
    })

    test.each([[{ year: 2026 }], [{ year: 2026, acceptYear: '2030' }]])(
      'GET with query %j redirects to choose-year',
      async (query) => {
        const { result } = await run(
          getController,
          DEC_2026,
          buildRequest({ query })
        )

        expect(result.location).toBe(chooseYearHref)
      }
    )

    test('POST sends the chosen year', async () => {
      const { request } = await run(
        postController,
        DEC_2026,
        buildRequest({ query: { year: 2026, acceptYear: '2027' } })
      )

      expect(sentPayload(request)).toEqual(
        expect.objectContaining({ status: 'ACCEPTED', obligationYear: 2027 })
      )
    })

    test.each([[{ year: 2026 }], [{ year: 2026, acceptYear: '2030' }]])(
      'POST with query %j does not accept and redirects to choose-year',
      async (query) => {
        const { request, result } = await run(
          postController,
          DEC_2026,
          buildRequest({ query })
        )

        expect(sentPayload(request)).toBeUndefined()
        expect(result.location).toBe(chooseYearHref)
      }
    )
  })

  describe('with a single year available (after January)', () => {
    test('GET shows the year it will be accepted into, not the PRN year', async () => {
      const { result } = await run(
        getController,
        MAR_2027,
        buildRequest({ query: { year: 2027 } })
      )

      expect(result.model.obligationYear).toBe(2027)
    })

    test('POST sends that single year without needing a choice', async () => {
      const { request } = await run(
        postController,
        MAR_2027,
        buildRequest({ query: { year: 2027 } })
      )

      expect(sentPayload(request)).toEqual(
        expect.objectContaining({ status: 'ACCEPTED', obligationYear: 2027 })
      )
    })
  })

  test('a standard PRN is accepted without sending a year', async () => {
    const { request } = await run(
      postController,
      DEC_2026,
      buildRequest({
        query: { year: 2026 },
        prn: { ...decemberPrn, decemberWaste: false }
      })
    )

    expect('obligationYear' in sentPayload(request)).toBe(false)
  })
})
