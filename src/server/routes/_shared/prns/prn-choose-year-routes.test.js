import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  csoConfirmAcceptPrnPath,
  csoPrnPath,
  producerConfirmAcceptPrnPath,
  producerPrnPath
} from './prns-paths.js'
import { prnRouteOptions } from './prns-route-options.js'
import { buildPrnChooseYearRoutes } from './prn-choose-year-routes.js'

const id = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const prnId = 'f2b1c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d'

const journeys = [
  {
    label: 'producer',
    paramKey: 'organisationId',
    path: '/producer/{organisationId}/prns/{prnId}/choose-year',
    prnPath: producerPrnPath,
    confirmAcceptPath: producerConfirmAcceptPrnPath,
    base: `/producer/${id}/prns/${prnId}`
  },
  {
    label: 'CSO',
    paramKey: 'schemeId',
    path: '/cso/{schemeId}/prns/{prnId}/choose-year',
    prnPath: csoPrnPath,
    confirmAcceptPath: csoConfirmAcceptPrnPath,
    base: `/cso/${id}/prns/${prnId}`
  }
]

describe.each(journeys)(
  'buildPrnChooseYearRoutes ($label)',
  ({ paramKey, path, prnPath, confirmAcceptPath, base }) => {
    const pre = [vi.fn()]
    const [getController, postController] = buildPrnChooseYearRoutes({
      path,
      paramKey,
      pre,
      prnPath,
      confirmAcceptPath
    })

    const decemberPrn = {
      id: prnId,
      type: 'PRN',
      status: 'AwaitingAcceptance',
      obligationYear: 2026,
      decemberWaste: true
    }

    function buildRequest(overrides = {}) {
      return {
        params: { [paramKey]: id, prnId },
        query: { year: 2026 },
        payload: {},
        headers: {},
        pre: { prn: decemberPrn },
        ...overrides
      }
    }

    function buildH() {
      return {
        view: vi.fn(),
        redirect: vi.fn((to) => ({ redirectedTo: to }))
      }
    }

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-12-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('shares path, pre list and route options', () => {
      expect(getController.path).toBe(path)
      expect(postController.path).toBe(path)
      expect(getController.options.pre).toBe(pre)
      expect(postController.options.pre).toBe(pre)
      expect(getController.options.validate).toBe(prnRouteOptions.validate)
    })

    test('GET renders the year options for a December waste PRN', () => {
      const h = buildH()

      getController.handler(buildRequest(), h)

      expect(h.view).toHaveBeenCalledWith(
        '_shared/prns/views/prn-choose-year',
        expect.objectContaining({
          [paramKey]: id,
          yearItems: [
            { value: 2026, text: 2026 },
            { value: 2027, text: 2027 }
          ],
          formErrors: null,
          backLink: `${base}?year=2026`
        })
      )
    })

    test('GET skips to confirm when there is no year choice', () => {
      const h = buildH()
      const request = buildRequest({
        pre: { prn: { ...decemberPrn, decemberWaste: false } }
      })

      const result = getController.handler(request, h)

      expect(result.redirectedTo).toBe(`${base}/confirm-accept?year=2026`)
      expect(h.view).not.toHaveBeenCalled()
    })

    test('GET redirects to the PRN when it is no longer awaiting acceptance', () => {
      const h = buildH()
      const request = buildRequest({
        pre: { prn: { ...decemberPrn, status: 'Accepted' } }
      })

      const result = getController.handler(request, h)

      expect(result.redirectedTo).toBe(`${base}?year=2026`)
    })

    test('POST with a chosen year redirects to confirm with the acceptYear', () => {
      const h = buildH()

      const result = postController.handler(
        buildRequest({ payload: { acceptYear: '2027' } }),
        h
      )

      expect(result.redirectedTo).toBe(
        `${base}/confirm-accept?year=2026&acceptYear=2027`
      )
    })

    test.each([
      [{}],
      [undefined],
      [{ acceptYear: '2030' }],
      [{ acceptYear: 'x' }]
    ])('POST with payload %j re-renders with an error', (payload) => {
      const h = buildH()

      postController.handler(buildRequest({ payload, locale: 'en' }), h)

      expect(h.view).toHaveBeenCalledWith(
        '_shared/prns/views/prn-choose-year',
        expect.objectContaining({
          formErrors: expect.objectContaining({
            summary: [expect.objectContaining({ href: '#acceptYear' })]
          })
        })
      )
    })

    test('POST skips to confirm when there is no year choice', () => {
      const h = buildH()
      const request = buildRequest({
        payload: { acceptYear: '2026' },
        pre: { prn: { ...decemberPrn, decemberWaste: false } }
      })

      const result = postController.handler(request, h)

      expect(result.redirectedTo).toBe(`${base}/confirm-accept?year=2026`)
    })

    test('POST redirects to the PRN when it is no longer awaiting acceptance', () => {
      const h = buildH()
      const request = buildRequest({
        payload: { acceptYear: '2027' },
        pre: { prn: { ...decemberPrn, status: 'Accepted' } }
      })

      const result = postController.handler(request, h)

      expect(result.redirectedTo).toBe(`${base}?year=2026`)
    })
  }
)
