import { afterEach, describe, expect, test, vi } from 'vitest'

import { config } from '#/config/config.js'
import { prnsCheckSelectionRouteOptions } from './prns-route-options.js'
import { buildPrnsAcceptedSelectionRoute } from './prns-accepted-selection-routes.js'

const id = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

const journeys = [
  {
    label: 'producer',
    paramKey: 'organisationId',
    path: '/producer/{organisationId}/prns/accepted-selection',
    userType: 'producer',
    listPath: `/producer/${id}/prns`,
    obligationsPath: `/producer/${id}/obligations`
  },
  {
    label: 'CSO',
    paramKey: 'schemeId',
    path: '/cso/{schemeId}/prns/accepted-selection',
    userType: 'cso',
    listPath: `/cso/${id}/prns`,
    obligationsPath: `/cso/${id}/obligations`
  }
]

describe.each(journeys)(
  'buildPrnsAcceptedSelectionRoute ($label)',
  ({ paramKey, path, userType, listPath, obligationsPath }) => {
    const sessionKey = `acceptedPrns:${userType}:${id}`
    const pre = [vi.fn()]
    const controller = buildPrnsAcceptedSelectionRoute({
      path,
      paramKey,
      userType,
      pre
    })
    const previousManageObligations = config.get('features.manageObligations')

    afterEach(() => {
      config.set('features.manageObligations', previousManageObligations)
    })

    function buildRequest({ accepted, query = {}, headers } = {}) {
      const store = new Map()

      if (accepted) {
        store.set(sessionKey, accepted)
      }

      return {
        store,
        params: { [paramKey]: id },
        query,
        headers,
        yar: {
          get: (key) => store.get(key),
          set: (key, value) => store.set(key, value),
          clear: (key) => store.delete(key)
        }
      }
    }

    function buildH() {
      return {
        view: vi.fn((_viewName, model) => ({ model })),
        redirect: vi.fn((location) => ({ location }))
      }
    }

    const accepted = [
      { material: 'Plastic', tonnage: 50 },
      { material: 'Plastic', tonnage: 25 },
      { material: 'Fibre', tonnage: 5 }
    ]

    test('is a GET with the check-selection validation and the given pre list', () => {
      expect(controller.method).toBe('GET')
      expect(controller.path).toBe(path)
      expect(controller.options.pre).toBe(pre)
      expect(controller.options.validate).toBe(
        prnsCheckSelectionRouteOptions.validate
      )
    })

    test('shows the accepted count and tonnage by material, and keeps them for a reload', () => {
      config.set('features.manageObligations', true)
      const h = buildH()
      const request = buildRequest({ accepted, query: { year: 2026 } })

      const { model } = controller.handler(request, h)

      expect(h.view).toHaveBeenCalledWith(
        '_shared/prns/views/prns-accepted-selection',
        model
      )
      expect(model).toMatchObject({
        [paramKey]: id,
        year: 2026,
        count: 3,
        materials: [
          {
            material: 'Paper',
            label: 'Paper, board or fibre-based composite material',
            totalTonnage: 5
          },
          { material: 'Plastic', label: 'Plastic', totalTonnage: 75 }
        ],
        showObligationsLink: true,
        obligationsLink: `${obligationsPath}?year=2026`
      })
      expect(request.store.has(sessionKey)).toBe(true)
    })

    test('names each material from compliance.components.obligationsTable.material', () => {
      const { model } = controller.handler(
        buildRequest({
          accepted: [
            { material: 'Aluminium', tonnage: 1 },
            { material: 'Glass', tonnage: 1 },
            { material: 'GlassRemelt', tonnage: 1 },
            { material: 'Paper', tonnage: 1 },
            { material: 'Fibre', tonnage: 1 },
            { material: 'Plastic', tonnage: 1 },
            { material: 'Steel', tonnage: 1 },
            { material: 'Wood', tonnage: 1 }
          ],
          query: { year: 2026 }
        }),
        buildH()
      )

      expect(
        model.materials.map(({ material, label }) => [material, label])
      ).toEqual([
        ['Aluminium', 'Aluminium'],
        ['Glass', 'Remaining glass'],
        ['GlassRemelt', 'Glass remelt'],
        ['Paper', 'Paper, board or fibre-based composite material'],
        ['Plastic', 'Plastic'],
        ['Steel', 'Steel'],
        ['Wood', 'Wood']
      ])
    })

    test('labels a fibre-based value as paper, which it is grouped with', () => {
      const { model } = controller.handler(
        buildRequest({
          accepted: [{ material: 'FibreComposite', tonnage: 3 }],
          query: { year: 2026 }
        }),
        buildH()
      )

      expect(model.materials).toEqual([
        {
          material: 'Paper',
          label: 'Paper, board or fibre-based composite material',
          totalTonnage: 3
        }
      ])
    })

    test.each([
      ['an unrecognised material', 'Copper'],
      ['an unmapped raw API value', 'GlassOther'],
      ['a missing material', null]
    ])('gives no label for %s', (_label, material) => {
      const { model } = controller.handler(
        buildRequest({
          accepted: [{ material, tonnage: 3 }],
          query: { year: 2026 }
        }),
        buildH()
      )

      expect(model.materials).toEqual([
        expect.objectContaining({ label: undefined, totalTonnage: 3 })
      ])
    })

    test('hides the obligations link without a year', () => {
      config.set('features.manageObligations', true)
      const { model } = controller.handler(buildRequest({ accepted }), buildH())

      expect(model.showObligationsLink).toBe(false)
    })

    // MO-471 AC5: without the CDP obligations page, the button goes to the
    // configured Azure obligations page, for the year accepted into, instead
    // of being hidden. That is another service, so it never gets the
    // forwarded prefix.
    test('links to the Azure obligations page for the accepted year when manage obligations is off', () => {
      config.set('features.manageObligations', false)
      const { model } = controller.handler(
        buildRequest({
          accepted,
          query: { year: 2026 },
          headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
        }),
        buildH()
      )

      expect(model.showObligationsLink).toBe(true)
      expect(model.obligationsLink).toBe(
        `${config.get('eprPackaging.manageYourRecyclingObligationsUrl')}?year=2026`
      )
    })

    test('passes the year the PRNs were accepted into to Azure, not the list year', () => {
      config.set('features.manageObligations', false)
      const { model } = controller.handler(
        buildRequest({
          accepted: [{ material: 'Glass', tonnage: 4, acceptanceYear: 2027 }],
          query: { year: 2026 }
        }),
        buildH()
      )

      expect(model.obligationsLink).toBe(
        `${config.get('eprPackaging.manageYourRecyclingObligationsUrl')}?year=2027`
      )
    })

    test('prefixes the links with the X-Forwarded-Prefix', () => {
      config.set('features.manageObligations', true)
      const { model } = controller.handler(
        buildRequest({
          accepted,
          query: { year: 2026 },
          headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
        }),
        buildH()
      )

      expect(model.obligationsLink).toBe(
        `/manage-recycling-obligations${obligationsPath}?year=2026`
      )
    })

    test('redirects to the list when nothing was accepted', () => {
      const h = buildH()

      controller.handler(buildRequest({ query: { year: 2026 } }), h)

      expect(h.redirect).toHaveBeenCalledWith(`${listPath}?year=2026`)
      expect(h.view).not.toHaveBeenCalled()
    })

    test('keeps the list sort, filter and page when redirecting to the list', () => {
      const h = buildH()

      controller.handler(
        buildRequest({
          query: {
            year: 2026,
            sort: 'TonnageDescending',
            material: 'Plastic',
            page: 2,
            pageSize: 20,
            unrelated: 'dropped'
          }
        }),
        h
      )

      expect(h.redirect).toHaveBeenCalledWith(
        `${listPath}?year=2026&sort=TonnageDescending&material=Plastic&page=2&pageSize=20`
      )
    })
  }
)
