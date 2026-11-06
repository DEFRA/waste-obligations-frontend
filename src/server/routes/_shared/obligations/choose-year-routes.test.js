import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { buildObligationsChooseYearRoutes } from './choose-year-routes.js'
import { producerObligationsParamsSchema } from './schema.js'
import {
  csoObligationsHomePath,
  producerObligationsHomePath
} from './obligations-paths.js'
import {
  csoStatementPath,
  producerCertificatePath
} from '#/server/routes/_shared/compliance/compliance-paths.js'

const id = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

const journeys = [
  {
    label: 'producer',
    paramKey: 'organisationId',
    path: '/producer/{organisationId}/obligations/choose-year',
    obligationsPath: producerObligationsHomePath,
    compliancePath: (year) => `${producerCertificatePath(id)}?year=${year}`
  },
  {
    label: 'CSO',
    paramKey: 'schemeId',
    path: '/cso/{schemeId}/obligations/choose-year',
    obligationsPath: csoObligationsHomePath,
    compliancePath: (year) => `${csoStatementPath(id)}?year=${year}`
  }
]

describe.each(journeys)(
  'buildObligationsChooseYearRoutes ($label)',
  ({ paramKey, path, obligationsPath, compliancePath }) => {
    const pre = [vi.fn()]
    const params = Object.fromEntries([[paramKey, id]])
    const [getController, postController] = buildObligationsChooseYearRoutes({
      path,
      paramKey,
      paramsSchema: producerObligationsParamsSchema,
      pre,
      obligationsPath,
      compliancePath: (_id, year) => compliancePath(year)
    })

    function buildRequest(payload = {}, lang) {
      return {
        params,
        query: lang ? { lang } : {},
        payload,
        headers: {},
        yar: { get: () => null, set: () => {} }
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

    test('registers a GET and a POST on the path with the given pre handlers', () => {
      expect(getController.method).toBe('GET')
      expect(postController.method).toBe('POST')
      expect(getController.path).toBe(path)
      expect(postController.path).toBe(path)
      expect(getController.options.pre).toBe(pre)
      expect(postController.options.pre).toBe(pre)
    })

    test('GET shows the years that can be chosen, with none selected', () => {
      const h = buildH()

      getController.handler(buildRequest(), h)

      const [view, model] = h.view.mock.calls[0]

      expect(view).toBe('_shared/obligations/views/choose-year')
      expect(model.yearItems.map((item) => item.value)).toEqual([
        2027, 2026, 2025
      ])
      expect(model.yearItems.some((item) => item.checked)).toBe(false)
      expect(model.formErrors).toBeNull()
    })

    test('GET offers no next year outside December and January', () => {
      vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
      const h = buildH()

      getController.handler(buildRequest(), h)

      const [, model] = h.view.mock.calls[0]

      expect(model.yearItems.map((item) => item.value)).toEqual([2026, 2025])
    })

    test('POST with no year re-renders with an error pointing at the first year', () => {
      const h = buildH()

      postController.handler(buildRequest({}), h)

      const [view, model] = h.view.mock.calls[0]

      expect(view).toBe('_shared/obligations/views/choose-year')
      expect(model.formErrors.message).toBe('Select a year')
      expect(model.formErrors.summary).toEqual([
        { text: 'Select a year', href: '#obligationYear' }
      ])
      expect(h.redirect).not.toHaveBeenCalled()
    })

    test('POST with a year that is not offered re-renders with the error', () => {
      const h = buildH()

      postController.handler(buildRequest({ obligationYear: '2028' }), h)

      expect(h.view.mock.calls[0][1].formErrors).not.toBeNull()
      expect(h.redirect).not.toHaveBeenCalled()
    })

    test.each(['2026.0', ' 2026 ', '0x7EA', '2026abc'])(
      'POST with the loosely written year %j re-renders with the error',
      (obligationYear) => {
        const h = buildH()

        postController.handler(buildRequest({ obligationYear }), h)

        expect(h.view.mock.calls[0][1].formErrors).not.toBeNull()
        expect(h.redirect).not.toHaveBeenCalled()
      }
    )

    test('POST with the year given twice re-renders with the error', () => {
      const h = buildH()

      postController.handler(
        buildRequest({ obligationYear: ['2026', '2027'] }),
        h
      )

      expect(h.view.mock.calls[0][1].formErrors).not.toBeNull()
      expect(h.redirect).not.toHaveBeenCalled()
    })

    test('POST with no payload at all re-renders with the error', () => {
      const h = buildH()
      const request = buildRequest()

      delete request.payload
      postController.handler(request, h)

      expect(h.view.mock.calls[0][1].formErrors).not.toBeNull()
    })

    test('POST with a year that is not a number re-renders with the error', () => {
      const h = buildH()

      postController.handler(buildRequest({ obligationYear: 'abc' }), h)

      expect(h.view.mock.calls[0][1].formErrors).not.toBeNull()
    })

    test.each([2027, 2026])(
      'POST with %i redirects to the obligations page for that year',
      (year) => {
        const h = buildH()

        const result = postController.handler(
          buildRequest({ obligationYear: String(year) }),
          h
        )

        expect(result.redirectedTo).toBe(obligationsPath(id, year))
      }
    )

    test('POST with 2025 redirects to the compliance page for 2025', () => {
      const h = buildH()

      const result = postController.handler(
        buildRequest({ obligationYear: '2025' }),
        h
      )

      expect(result.redirectedTo).toBe(compliancePath(2025))
    })

    test('POST with a year the page does not offer is rejected even when the year exists elsewhere', () => {
      vi.setSystemTime(new Date('2026-11-15T12:00:00Z'))
      const h = buildH()

      postController.handler(buildRequest({ obligationYear: '2027' }), h)

      expect(h.view.mock.calls[0][1].formErrors).not.toBeNull()
    })
  }
)
