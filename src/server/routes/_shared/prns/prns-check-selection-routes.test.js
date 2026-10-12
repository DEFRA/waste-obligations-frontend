import { describe, expect, test, vi } from 'vitest'

import { prnsCheckSelectionRouteOptions } from './prns-route-options.js'
import { checkSelectionPayloadSchema } from './schema.js'
import { buildPrnsCheckSelectionRoutes } from './prns-check-selection-routes.js'

const id = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'
const prnId = 'd93376e3-0681-46be-aeb4-7450a2e784d8'
const otherPrnId = 'a1b2c3d4-0681-46be-aeb4-7450a2e784d8'
const nowSpyDate = new Date('2026-06-15T12:00:00Z')

const journeys = [
  {
    label: 'producer',
    paramKey: 'organisationId',
    path: '/producer/{organisationId}/prns/check-selection',
    userType: 'producer',
    listPath: `/producer/${id}/prns`,
    checkSelectionPath: `/producer/${id}/prns/check-selection`
  },
  {
    label: 'CSO',
    paramKey: 'schemeId',
    path: '/cso/{schemeId}/prns/check-selection',
    userType: 'cso',
    listPath: `/cso/${id}/prns`,
    checkSelectionPath: `/cso/${id}/prns/check-selection`
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
    ...overrides
  }
}

describe.each(journeys)(
  'buildPrnsCheckSelectionRoutes ($label)',
  ({ paramKey, path, userType, listPath, checkSelectionPath }) => {
    const sessionKey = `selectedPrnIds:${userType}:${id}`
    const dataSessionKey = `selectedPrnsData:${userType}:${id}`
    const listQuerySessionKey = `selectedPrnsListQuery:${userType}:${id}`
    const pre = [vi.fn()]
    const [getController, postController] = buildPrnsCheckSelectionRoutes({
      path,
      paramKey,
      userType,
      pre
    })

    function buildRequest({
      selectedIds,
      listQuery,
      prnsData,
      query = {},
      payload,
      headers
    } = {}) {
      const store = new Map()

      if (selectedIds) {
        store.set(sessionKey, selectedIds)
      }

      if (prnsData) {
        store.set(dataSessionKey, prnsData)
      }

      if (listQuery) {
        store.set(listQuerySessionKey, listQuery)
      }

      return {
        store,
        params: { [paramKey]: id },
        query,
        payload,
        headers,
        pre: { organisation: { name: 'Example Operator Ltd' } },
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

    test('GET and POST share the check-selection path and pre list', () => {
      expect(getController.method).toBe('GET')
      expect(postController.method).toBe('POST')
      expect(getController.path).toBe(path)
      expect(postController.path).toBe(path)
      expect(getController.options.pre).toBe(pre)
      expect(postController.options.pre).toBe(pre)
      expect(getController.options.validate).toBe(
        prnsCheckSelectionRouteOptions.validate
      )
      expect(postController.options.validate.payload).toBe(
        checkSelectionPayloadSchema
      )
    })

    describe('GET', () => {
      test('renders the selected PRNs grouped by material', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = buildH()
        const request = buildRequest({
          selectedIds: [prnId, otherPrnId],
          prnsData: [
            buildPrn(),
            buildPrn({
              id: otherPrnId,
              number: 'PRN456',
              material: 'Steel',
              tonnage: 20
            })
          ],
          query: { year: 2026 }
        })

        const { model } = await getController.handler(request, h)

        expect(h.view).toHaveBeenCalledWith(
          '_shared/prns/views/prns-check-selection',
          model
        )
        expect(model[paramKey]).toBe(id)
        expect(model.year).toBe(2026)
        expect(model.backLink).toBe(`${listPath}?year=2026`)
        expect(
          model.viewModel.groups.map((group) => [
            group.heading,
            group.totalTonnage
          ])
        ).toEqual([
          ['Plastic', 75],
          ['Steel', 20]
        ])

        vi.useRealTimers()
      })

      test('prefixes the back links with the X-Forwarded-Prefix', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = buildH()
        const request = buildRequest({
          selectedIds: [prnId],
          prnsData: [buildPrn()],
          headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
        })

        const { model } = await getController.handler(request, h)

        expect(model.backLink).toBe(`/manage-recycling-obligations${listPath}`)

        vi.useRealTimers()
      })

      test('redirects to the list when nothing is selected', async () => {
        const h = buildH()
        const request = buildRequest({ query: { year: 2026 } })

        await getController.handler(request, h)

        expect(h.redirect).toHaveBeenCalledWith(`${listPath}?year=2026`)
      })

      test('carries the list sort, filter and page through the back link', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = buildH()
        const request = buildRequest({
          selectedIds: [prnId],
          prnsData: [buildPrn()],
          listQuery: {
            year: 2026,
            sort: 'TonnageDescending',
            material: 'Plastic',
            page: 2,
            pageSize: 20
          }
        })

        const { model } = await getController.handler(request, h)

        const expectedHref = `${listPath}?year=2026&sort=TonnageDescending&material=Plastic&page=2&pageSize=20`
        expect(model.backLink).toBe(expectedHref)

        vi.useRealTimers()
      })

      test('carries the list sort, filter and page through the redirect when nothing is selected', async () => {
        const h = buildH()
        const request = buildRequest({
          query: { year: 2026 },
          listQuery: {
            year: 2026,
            sort: 'TonnageDescending',
            material: 'Plastic',
            page: 2,
            pageSize: 20
          }
        })

        await getController.handler(request, h)

        expect(h.redirect).toHaveBeenCalledWith(
          `${listPath}?year=2026&sort=TonnageDescending&material=Plastic&page=2&pageSize=20`
        )
      })

      test('drops PRNs that can no longer be multi-selected from the selection', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = buildH()
        const acceptedPrnId = 'c1b2c3d4-0681-46be-aeb4-7450a2e784d8'
        const request = buildRequest({
          selectedIds: [prnId, otherPrnId, acceptedPrnId],
          prnsData: [
            buildPrn(),
            buildPrn({ id: otherPrnId, obligationYear: 2030 }),
            buildPrn({ id: acceptedPrnId, status: 'Accepted' })
          ]
        })

        const { model } = await getController.handler(request, h)

        expect(request.store.get(sessionKey)).toEqual([prnId])
        expect(model.viewModel.groups[0].rows.map((row) => row.id)).toEqual([
          prnId
        ])

        vi.useRealTimers()
      })

      test('clears the selection and redirects when no selected PRN is still selectable', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = buildH()
        const request = buildRequest({
          selectedIds: [prnId],
          prnsData: [buildPrn({ status: 'Accepted' })]
        })

        await getController.handler(request, h)

        expect(request.store.has(sessionKey)).toBe(false)
        expect(h.redirect).toHaveBeenCalledWith(listPath)
        expect(h.view).not.toHaveBeenCalled()

        vi.useRealTimers()
      })

      test('drops a selected PRN with no cached data instead of failing the page', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = buildH()
        const request = buildRequest({
          selectedIds: [prnId, otherPrnId],
          prnsData: [buildPrn()]
        })

        const { model } = await getController.handler(request, h)

        expect(request.store.get(sessionKey)).toEqual([prnId])
        expect(model.viewModel.groups[0].rows.map((row) => row.id)).toEqual([
          prnId
        ])

        vi.useRealTimers()
      })
    })

    describe('POST', () => {
      test('removes the PRN from the selection and reloads the page', async () => {
        const h = buildH()
        const request = buildRequest({
          selectedIds: [prnId, otherPrnId],
          query: { year: 2026 },
          payload: { removePrnId: prnId }
        })

        await postController.handler(request, h)

        expect(request.store.get(sessionKey)).toEqual([otherPrnId])
        expect(h.redirect).toHaveBeenCalledWith(
          `${checkSelectionPath}?year=2026`
        )
      })

      test('clears the selection when the last PRN is removed', async () => {
        const h = buildH()
        const request = buildRequest({
          selectedIds: [prnId],
          payload: { removePrnId: prnId }
        })

        await postController.handler(request, h)

        expect(request.store.has(sessionKey)).toBe(false)
        expect(h.redirect).toHaveBeenCalledWith(checkSelectionPath)
      })

      test('going back clears the stored selection and redirects to the list', async () => {
        const h = buildH()
        const request = buildRequest({
          selectedIds: [prnId, otherPrnId],
          query: { year: 2026 },
          payload: { goBack: 'true' }
        })

        await postController.handler(request, h)

        expect(request.store.has(sessionKey)).toBe(false)
        expect(h.redirect).toHaveBeenCalledWith(`${listPath}?year=2026`)
      })

      test('going back carries the list sort, filter and page through the redirect', async () => {
        const h = buildH()
        const request = buildRequest({
          selectedIds: [prnId],
          query: { year: 2026 },
          listQuery: {
            year: 2026,
            sort: 'TonnageDescending',
            material: 'Plastic',
            page: 2,
            pageSize: 20
          },
          payload: { goBack: 'true' }
        })

        await postController.handler(request, h)

        expect(h.redirect).toHaveBeenCalledWith(
          `${listPath}?year=2026&sort=TonnageDescending&material=Plastic&page=2&pageSize=20`
        )
      })
    })
  }
)
