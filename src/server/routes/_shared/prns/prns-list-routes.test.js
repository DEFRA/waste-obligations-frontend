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
    prnHref: `/producer/${id}/prns/${prnId}?year=2026`,
    checkSelectionPath: `/producer/${id}/prns/check-selection`
  },
  {
    label: 'CSO',
    paramKey: 'schemeId',
    path: '/cso/{schemeId}/prns',
    userType: 'cso',
    prnHref: `/cso/${id}/prns/${prnId}?year=2026`,
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
    additionalNotes: 'PO 1',
    ...overrides
  }
}

describe.each(journeys)(
  'buildPrnsListRoutes ($label)',
  ({ paramKey, path, userType, prnHref, checkSelectionPath }) => {
    const pre = [vi.fn(), vi.fn()]
    const [getController, postController, selectionController] =
      buildPrnsListRoutes({
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
      payload,
      session = {}
    } = {}) {
      const store = new Map(Object.entries(session))

      return {
        store,
        params: { [paramKey]: id },
        query,
        headers,
        payload,
        app: {},
        yar: {
          get: vi.fn((key) => store.get(key)),
          set: vi.fn((key, value) => store.set(key, value)),
          clear: vi.fn((key) => store.delete(key))
        },
        pre: {
          organisation: { name: 'Example Operator Ltd' },
          prns: { prns, total, page, pageSize }
        }
      }
    }

    function buildH() {
      const response = { code: vi.fn((statusCode) => ({ statusCode })) }

      return {
        view: vi.fn((_viewName, model) => ({ model })),
        redirect: vi.fn((location) => ({ location })),
        response: vi.fn(() => response)
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
      test('clears the confirmation of an earlier bulk accept', async () => {
        const h = { view: vi.fn((_viewName, model) => ({ model })) }
        const request = buildRequest({ prns: [buildPrn()] })

        await getController.handler(request, h)

        expect(request.yar.clear).toHaveBeenCalledWith(
          `acceptedPrns:${userType}:${id}`
        )
      })

      test('ticks the PRNs kept in the session', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = { view: vi.fn((_viewName, model) => ({ model })) }
        const otherPrnId = 'a1b2c3d4-0681-46be-aeb4-7450a2e784d8'
        const prn = buildPrn()
        const request = buildRequest({
          prns: [prn, buildPrn({ id: otherPrnId, number: 'PRN456' })],
          query: { year: 2026 },
          session: {
            [`selectedPrnIds:${userType}:${id}`]: [prnId],
            [`selectedPrnsData:${userType}:${id}`]: [prn],
            [`selectedPrnsListQuery:${userType}:${id}`]: { year: 2026 }
          }
        })

        const { model } = await getController.handler(request, h)

        const [ticked, unticked] = model.prnsViewModel.rows
        expect(ticked.number.html).toContain(`value="${prnId}" checked>`)
        expect(unticked.number.html).not.toContain(' checked')
        expect(request.store.get(`selectedPrnIds:${userType}:${id}`)).toEqual([
          prnId
        ])

        vi.useRealTimers()
      })

      test('drops a selection made for another year', async () => {
        const h = { view: vi.fn((_viewName, model) => ({ model })) }
        const prn = buildPrn()
        const request = buildRequest({
          prns: [prn],
          query: { year: 2027 },
          session: {
            [`selectedPrnIds:${userType}:${id}`]: [prnId],
            [`selectedPrnsData:${userType}:${id}`]: [prn],
            [`selectedPrnsListQuery:${userType}:${id}`]: { year: 2026 }
          }
        })

        const { model } = await getController.handler(request, h)

        expect(model.prnsViewModel.rows[0].number.html).not.toContain(
          ' checked'
        )
        expect(request.store.has(`selectedPrnIds:${userType}:${id}`)).toBe(
          false
        )
      })

      test('drops a selected PRN on this page that is no longer awaiting acceptance', async () => {
        const h = { view: vi.fn((_viewName, model) => ({ model })) }
        const accepted = buildPrn({ status: 'Accepted' })
        const request = buildRequest({
          prns: [accepted],
          query: { year: 2026 },
          session: {
            [`selectedPrnIds:${userType}:${id}`]: [prnId],
            [`selectedPrnsData:${userType}:${id}`]: [buildPrn()],
            [`selectedPrnsListQuery:${userType}:${id}`]: { year: 2026 }
          }
        })

        await getController.handler(request, h)

        expect(request.store.has(`selectedPrnIds:${userType}:${id}`)).toBe(
          false
        )
      })

      test('gives the form the address that saves each tick, with the list query', async () => {
        const h = { view: vi.fn((_viewName, model) => ({ model })) }
        const request = buildRequest({
          prns: [buildPrn()],
          query: { year: 2026, sort: 'TonnageDescending', page: 2 },
          headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
        })

        const { model } = await getController.handler(request, h)

        expect(model.selectionHref).toBe(
          `/manage-recycling-obligations/${userType}/${id}/prns/selection?year=2026&sort=TonnageDescending&page=2`
        )
      })

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

      test('redirects to the last valid page instead of rendering an empty page when the list has shrunk', async () => {
        const h = buildH()
        const request = buildRequest({
          prns: [],
          total: 20,
          page: 3,
          pageSize: 10,
          query: { year: 2026, page: 3, pageSize: 10 }
        })

        const result = await getController.handler(request, h)

        expect(h.view).not.toHaveBeenCalled()
        expect(h.redirect).toHaveBeenCalledWith(
          `${path.replace(`{${paramKey}}`, id)}?year=2026&pageSize=10&page=2`
        )
        expect(result).toEqual({
          location: `${path.replace(`{${paramKey}}`, id)}?year=2026&pageSize=10&page=2`
        })
      })

      test('renders the empty state, not a redirect, when there are genuinely no PRNs', async () => {
        const h = buildH()
        const request = buildRequest({
          prns: [],
          total: 0,
          page: 1,
          pageSize: 10,
          query: { year: 2026 }
        })

        await getController.handler(request, h)

        expect(h.redirect).not.toHaveBeenCalled()
        expect(h.view).toHaveBeenCalled()
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

      test('stores the selection and redirects to the check-selection page', async () => {
        const h = buildH()
        const otherPrnId = 'a1b2c3d4-0681-46be-aeb4-7450a2e784d8'
        const request = buildRequest({
          prns: [buildPrn(), buildPrn({ id: otherPrnId, number: 'PRN456' })],
          query: { year: 2026 },
          payload: { selectedPrnIds: [prnId, otherPrnId] }
        })

        const result = await postController.handler(request, h)

        expect(h.view).not.toHaveBeenCalled()
        expect(request.yar.set).toHaveBeenCalledWith(
          `selectedPrnIds:${userType}:${id}`,
          [prnId, otherPrnId]
        )
        expect(h.redirect).toHaveBeenCalledWith(
          `${checkSelectionPath}?year=2026`
        )
        expect(result).toEqual({ location: `${checkSelectionPath}?year=2026` })
      })

      test('caches the selected PRNs data from the list response, not the unselected ones', async () => {
        const h = buildH()
        const otherPrnId = 'a1b2c3d4-0681-46be-aeb4-7450a2e784d8'
        const selectedPrn = buildPrn()
        const unselectedPrn = buildPrn({ id: otherPrnId, number: 'PRN456' })
        const request = buildRequest({
          prns: [selectedPrn, unselectedPrn],
          payload: { selectedPrnIds: [prnId] }
        })

        await postController.handler(request, h)

        expect(request.yar.set).toHaveBeenCalledWith(
          `selectedPrnsData:${userType}:${id}`,
          [selectedPrn]
        )
      })

      test('redirects without a year when the list has none', async () => {
        const h = buildH()
        const request = buildRequest({
          prns: [buildPrn()],
          payload: { selectedPrnIds: prnId }
        })

        await postController.handler(request, h)

        expect(request.yar.set).toHaveBeenCalledWith(
          `selectedPrnIds:${userType}:${id}`,
          [prnId]
        )
        expect(h.redirect).toHaveBeenCalledWith(checkSelectionPath)
      })

      test('keeps the PRNs selected on other pages, and takes this page from the ticks', async () => {
        const h = buildH()
        const keptPrnId = 'c0ffee00-0681-46be-aeb4-7450a2e784d8'
        const untickedPrnId = 'a1b2c3d4-0681-46be-aeb4-7450a2e784d8'
        const kept = buildPrn({ id: keptPrnId, number: 'PRN900' })
        const ticked = buildPrn()
        const unticked = buildPrn({ id: untickedPrnId, number: 'PRN456' })
        const request = buildRequest({
          prns: [ticked, unticked],
          query: { year: 2026 },
          payload: { selectedPrnIds: [prnId] },
          session: {
            [`selectedPrnIds:${userType}:${id}`]: [keptPrnId, untickedPrnId],
            [`selectedPrnsData:${userType}:${id}`]: [kept, unticked],
            [`selectedPrnsListQuery:${userType}:${id}`]: { year: 2026 }
          }
        })

        await postController.handler(request, h)

        expect(request.store.get(`selectedPrnIds:${userType}:${id}`)).toEqual([
          keptPrnId,
          prnId
        ])
        expect(request.store.get(`selectedPrnsData:${userType}:${id}`)).toEqual(
          [kept, ticked]
        )
        expect(h.redirect).toHaveBeenCalledWith(
          `${checkSelectionPath}?year=2026`
        )
      })

      test('accepts nothing ticked on this page when PRNs are kept from other pages', async () => {
        const h = buildH()
        const keptPrnId = 'c0ffee00-0681-46be-aeb4-7450a2e784d8'
        const kept = buildPrn({ id: keptPrnId, number: 'PRN900' })
        const request = buildRequest({
          prns: [buildPrn()],
          query: { year: 2026 },
          payload: { selectedPrnIds: [] },
          session: {
            [`selectedPrnIds:${userType}:${id}`]: [keptPrnId],
            [`selectedPrnsData:${userType}:${id}`]: [kept],
            [`selectedPrnsListQuery:${userType}:${id}`]: { year: 2026 }
          }
        })

        await postController.handler(request, h)

        expect(h.redirect).toHaveBeenCalledWith(
          `${checkSelectionPath}?year=2026`
        )
        expect(request.store.get(`selectedPrnIds:${userType}:${id}`)).toEqual([
          keptPrnId
        ])
      })

      test('does not keep PRNs selected for another year', async () => {
        const h = { view: vi.fn((_viewName, model) => ({ model })) }
        const keptPrnId = 'c0ffee00-0681-46be-aeb4-7450a2e784d8'
        const request = buildRequest({
          prns: [buildPrn()],
          query: { year: 2027 },
          payload: { selectedPrnIds: [] },
          session: {
            [`selectedPrnIds:${userType}:${id}`]: [keptPrnId],
            [`selectedPrnsData:${userType}:${id}`]: [
              buildPrn({ id: keptPrnId })
            ],
            [`selectedPrnsListQuery:${userType}:${id}`]: { year: 2026 }
          }
        })

        const { model } = await postController.handler(request, h)

        expect(model.formErrors).not.toBeNull()
      })

      test('stores the list sort, filter and page alongside the selection', async () => {
        const h = buildH()
        const request = buildRequest({
          prns: [buildPrn()],
          query: {
            year: 2026,
            sort: 'TonnageDescending',
            material: 'Plastic',
            page: 2,
            pageSize: 20
          },
          payload: { selectedPrnIds: [prnId] }
        })

        await postController.handler(request, h)

        expect(request.yar.set).toHaveBeenCalledWith(
          `selectedPrnsListQuery:${userType}:${id}`,
          {
            year: 2026,
            sort: 'TonnageDescending',
            material: 'Plastic',
            page: 2,
            pageSize: 20
          }
        )
      })
    })

    describe('POST selection', () => {
      const otherPrnId = 'a1b2c3d4-0681-46be-aeb4-7450a2e784d8'
      const keptPrnId = 'c0ffee00-0681-46be-aeb4-7450a2e784d8'

      test('is mounted beside the list with its pre list and the list payload schema', () => {
        expect(selectionController.method).toBe('POST')
        expect(selectionController.path).toBe(`${path}/selection`)
        expect(selectionController.options.pre).toBe(pre)
        expect(selectionController.options.validate.query).toBe(
          prnsRouteOptions.validate.query
        )
        expect(selectionController.options.validate.payload).toBe(
          prnsListPayloadSchema
        )
      })

      test('saves the page ticks with their PRN data and the list query, and answers 204', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = buildH()
        const prn = buildPrn()
        const query = { year: 2026, sort: 'TonnageDescending', page: 2 }
        const request = buildRequest({
          prns: [prn, buildPrn({ id: otherPrnId, number: 'PRN456' })],
          query,
          payload: { selectedPrnIds: [prnId] }
        })

        const result = await selectionController.handler(request, h)

        expect(result).toEqual({ statusCode: 204 })
        expect(h.redirect).not.toHaveBeenCalled()
        expect(request.store.get(`selectedPrnIds:${userType}:${id}`)).toEqual([
          prnId
        ])
        expect(request.store.get(`selectedPrnsData:${userType}:${id}`)).toEqual(
          [prn]
        )
        expect(
          request.store.get(`selectedPrnsListQuery:${userType}:${id}`)
        ).toEqual(query)

        vi.useRealTimers()
      })

      test('replaces this page ticks and keeps the PRNs selected on other pages', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = buildH()
        const prn = buildPrn()
        const other = buildPrn({ id: otherPrnId, number: 'PRN456' })
        const kept = buildPrn({ id: keptPrnId, number: 'PRN900' })
        const request = buildRequest({
          prns: [prn, other],
          query: { year: 2026 },
          payload: { selectedPrnIds: [otherPrnId] },
          session: {
            [`selectedPrnIds:${userType}:${id}`]: [keptPrnId, prnId],
            [`selectedPrnsData:${userType}:${id}`]: [kept, prn],
            [`selectedPrnsListQuery:${userType}:${id}`]: { year: 2026 }
          }
        })

        await selectionController.handler(request, h)

        expect(request.store.get(`selectedPrnIds:${userType}:${id}`)).toEqual([
          keptPrnId,
          otherPrnId
        ])

        vi.useRealTimers()
      })

      test('clears the selection when the last tick is removed', async () => {
        const h = buildH()
        const prn = buildPrn()
        const request = buildRequest({
          prns: [prn],
          query: { year: 2026 },
          payload: {},
          session: {
            [`selectedPrnIds:${userType}:${id}`]: [prnId],
            [`selectedPrnsData:${userType}:${id}`]: [prn],
            [`selectedPrnsListQuery:${userType}:${id}`]: { year: 2026 }
          }
        })

        await selectionController.handler(request, h)

        expect(request.store.has(`selectedPrnIds:${userType}:${id}`)).toBe(
          false
        )
      })

      test('starts again when the ticks are for another year than the kept selection', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = buildH()
        const request = buildRequest({
          prns: [buildPrn()],
          query: { year: 2026 },
          payload: { selectedPrnIds: [prnId] },
          session: {
            [`selectedPrnIds:${userType}:${id}`]: [keptPrnId],
            [`selectedPrnsData:${userType}:${id}`]: [
              buildPrn({ id: keptPrnId })
            ],
            [`selectedPrnsListQuery:${userType}:${id}`]: { year: 2025 }
          }
        })

        await selectionController.handler(request, h)

        expect(request.store.get(`selectedPrnIds:${userType}:${id}`)).toEqual([
          prnId
        ])

        vi.useRealTimers()
      })

      test('ignores an id that is not on the list page', async () => {
        const h = buildH()
        const request = buildRequest({
          prns: [buildPrn()],
          query: { year: 2026 },
          payload: { selectedPrnIds: [otherPrnId] }
        })

        await selectionController.handler(request, h)

        expect(request.store.has(`selectedPrnIds:${userType}:${id}`)).toBe(
          false
        )
      })

      test('ignores a PRN on the page that can no longer be selected, and drops it from the selection', async () => {
        const h = buildH()
        const accepted = buildPrn({ status: 'Accepted' })
        const request = buildRequest({
          prns: [accepted],
          query: { year: 2026 },
          payload: { selectedPrnIds: [prnId] },
          session: {
            [`selectedPrnIds:${userType}:${id}`]: [prnId],
            [`selectedPrnsData:${userType}:${id}`]: [buildPrn()],
            [`selectedPrnsListQuery:${userType}:${id}`]: { year: 2026 }
          }
        })

        await selectionController.handler(request, h)

        expect(request.store.has(`selectedPrnIds:${userType}:${id}`)).toBe(
          false
        )
      })
    })
  }
)
