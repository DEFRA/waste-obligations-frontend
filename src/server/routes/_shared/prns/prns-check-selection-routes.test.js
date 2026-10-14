import { describe, expect, test, vi } from 'vitest'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { ApiError } from '#/server/services/base/api-error.js'
import { prnsCheckSelectionRouteOptions } from './prns-route-options.js'
import { checkSelectionPayloadSchema } from './schema.js'
import { buildPrnsCheckSelectionRoutes } from './prns-check-selection-routes.js'

// The shared clock (clock.js) honours STARTUP_UTC_TIMESTAMP_OVERRIDE. By default
// it follows the system time, so fake timers drive it; a test can set it apart
// from the system time to prove the route reads the shared clock.
const { clockNow } = vi.hoisted(() => ({ clockNow: vi.fn() }))
vi.mock('#/server/common/helpers/clock.js', () => ({
  now: () => clockNow() ?? new Date()
}))

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
    const acceptedSessionKey = `acceptedPrns:${userType}:${id}`
    const acceptedSelectionPath = `${listPath}/accepted-selection`
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
      headers,
      wasteObligationsApi = {}
    } = {}) {
      const store = new Map([
        [
          'user',
          {
            id: '00000000-0000-4000-8000-000000000001',
            email: 'test.user@example.com',
            firstName: 'Test',
            lastName: 'User'
          }
        ]
      ])

      if (selectedIds) {
        store.set(sessionKey, selectedIds)
      }

      if (prnsData) {
        store.set(dataSessionKey, prnsData)
      }

      if (listQuery) {
        store.set(listQuerySessionKey, listQuery)
      }

      // The backend's current view of each PRN: by default the same as the
      // session's cached copy. Tests that need a change set getPrn themselves.
      const currentPrn = (_organisationId, prnIdToRead) => {
        const prn = (prnsData ?? []).find((item) => item.id === prnIdToRead)

        if (!prn) {
          throw new ApiError({
            status: statusCodes.notFound,
            message: 'not found'
          })
        }

        return prn
      }

      return {
        store,
        params: { [paramKey]: id },
        query,
        payload,
        headers,
        pre: { organisation: { name: 'Example Operator Ltd' } },
        logger: { warn: vi.fn(), error: vi.fn() },
        server: {
          app: {
            wasteObligationsApi: {
              getPrn: async (organisationId, prnIdToRead) =>
                currentPrn(organisationId, prnIdToRead),
              ...wasteObligationsApi
            }
          }
        },
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

      test('drops a PRN the backend now shows as accepted, though the cached copy still says awaiting', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const h = buildH()
        const request = buildRequest({
          selectedIds: [prnId, otherPrnId],
          prnsData: [buildPrn(), buildPrn({ id: otherPrnId })],
          wasteObligationsApi: {
            getPrn: vi.fn(async (_id, prnIdToRead) =>
              prnIdToRead === otherPrnId
                ? buildPrn({ id: otherPrnId, status: 'Accepted' })
                : buildPrn()
            )
          }
        })

        const { model } = await getController.handler(request, h)

        expect(request.store.get(sessionKey)).toEqual([prnId])
        expect(model.viewModel.groups[0].rows.map((row) => row.id)).toEqual([
          prnId
        ])

        vi.useRealTimers()
      })

      test('fails the page when a selected PRN cannot be read from the backend', async () => {
        const request = buildRequest({
          selectedIds: [prnId],
          prnsData: [buildPrn()],
          wasteObligationsApi: {
            getPrn: vi
              .fn()
              .mockRejectedValue(new ApiError({ status: 500, message: 'boom' }))
          }
        })

        await expect(getController.handler(request, buildH())).rejects.toThrow()
        expect(request.store.get(sessionKey)).toEqual([prnId])
      })

      test('reads every selected PRN again from the backend, a batch of ten at a time', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const ids = Array.from({ length: 11 }, (_, index) =>
          index === 0
            ? prnId
            : `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
        )
        const getPrn = vi.fn(async (_id, prnIdToRead) =>
          buildPrn({ id: prnIdToRead })
        )
        const request = buildRequest({
          selectedIds: ids,
          prnsData: ids.map((id) => buildPrn({ id })),
          wasteObligationsApi: { getPrn }
        })

        await getController.handler(request, buildH())

        expect(getPrn).toHaveBeenCalledTimes(11)
        expect(request.store.get(sessionKey)).toEqual(ids)

        vi.useRealTimers()
      })

      test('shows the not found page without accepting when a selected PRN has gone by the time of accept', async () => {
        vi.useFakeTimers()
        vi.setSystemTime(nowSpyDate)

        const updatePrnStatuses = vi.fn().mockResolvedValue(null)
        const request = buildRequest({
          selectedIds: [prnId, otherPrnId],
          prnsData: [buildPrn(), buildPrn({ id: otherPrnId })],
          query: { year: 2026 },
          payload: { accept: 'true' },
          wasteObligationsApi: {
            getPrn: vi.fn(async (_id, prnIdToRead) => {
              if (prnIdToRead === otherPrnId) {
                throw new ApiError({
                  status: statusCodes.notFound,
                  message: 'gone'
                })
              }

              return buildPrn()
            }),
            updatePrnStatuses
          }
        })

        const error = await postController
          .handler(request, buildH())
          .catch((thrown) => thrown)

        expect(error.output.statusCode).toBe(statusCodes.notFound)
        expect(updatePrnStatuses).not.toHaveBeenCalled()
        expect(request.store.has(sessionKey)).toBe(false)

        vi.useRealTimers()
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
        expect(request.store.get(dataSessionKey).map((prn) => prn.id)).toEqual([
          prnId
        ])
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
          prnsData: [buildPrn({ status: 'Accepted' })],
          listQuery: { year: 2026, sort: 'TonnageDescending' }
        })

        await getController.handler(request, h)

        expect(request.store.has(sessionKey)).toBe(false)
        expect(request.store.has(dataSessionKey)).toBe(false)
        expect(request.store.has(listQuerySessionKey)).toBe(false)
        // The list query is read for the redirect before it is cleared.
        expect(h.redirect).toHaveBeenCalledWith(
          `${listPath}?year=2026&sort=TonnageDescending`
        )
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

      test('accepting with nothing selected redirects to the list without calling the API', async () => {
        const h = buildH()
        const request = buildRequest({
          selectedIds: [],
          prnsData: [],
          listQuery: { year: 2026, sort: 'TonnageDescending' },
          query: { year: 2026 },
          payload: { accept: 'true' }
        })

        await postController.handler(request, h)

        expect(h.redirect).toHaveBeenCalledWith(
          `${listPath}?year=2026&sort=TonnageDescending`
        )
        expect(request.store.has(sessionKey)).toBe(false)
        expect(request.store.has(dataSessionKey)).toBe(false)
        expect(request.store.has(listQuerySessionKey)).toBe(false)
      })

      describe('accepting', () => {
        const stalePrnId = 'c1b2c3d4-0681-46be-aeb4-7450a2e784d8'

        function buildAcceptRequest(wasteObligationsApi, extraPrns = []) {
          return buildRequest({
            selectedIds: [prnId, otherPrnId, ...extraPrns.map((prn) => prn.id)],
            prnsData: [
              buildPrn(),
              buildPrn({
                id: otherPrnId,
                number: 'PRN456',
                material: 'Steel',
                tonnage: 40
              }),
              ...extraPrns
            ],
            query: { year: 2026 },
            payload: { accept: 'true' },
            wasteObligationsApi
          })
        }

        test('judges selectability and the year with the shared clock, not the system time', async () => {
          // System time is June 2026, but the shared clock (as under
          // STARTUP_UTC_TIMESTAMP_OVERRIDE) is March 2027, when a 2027 PRN can
          // be accepted into 2027 and the system time would offer no year.
          vi.useFakeTimers()
          vi.setSystemTime(nowSpyDate)
          clockNow.mockReturnValue(new Date('2027-03-01T12:00:00Z'))

          try {
            const updatePrnStatuses = vi.fn().mockResolvedValue(null)
            const request = buildRequest({
              selectedIds: [prnId, otherPrnId],
              prnsData: [
                buildPrn({ obligationYear: 2027 }),
                buildPrn({
                  id: otherPrnId,
                  material: 'Steel',
                  tonnage: 40,
                  obligationYear: 2027
                })
              ],
              query: { year: 2027 },
              payload: { accept: 'true' },
              wasteObligationsApi: { updatePrnStatuses }
            })

            await postController.handler(request, buildH())

            expect(updatePrnStatuses.mock.calls[0][1]).toMatchObject({
              prnIds: [prnId, otherPrnId],
              obligationYear: 2027
            })
            expect(
              request.store.get(acceptedSessionKey).map((x) => x.acceptanceYear)
            ).toEqual([2027, 2027])

            const pageRequest = buildRequest({
              selectedIds: [prnId],
              prnsData: [buildPrn({ obligationYear: 2027 })]
            })
            const { model } = await getController.handler(pageRequest, buildH())

            expect(model.viewModel.groups[0].rows[0].id).toBe(prnId)
          } finally {
            clockNow.mockReset()
            vi.useRealTimers()
          }
        })

        test('stores for the confirmation only the PRNs sent in a successful update', async () => {
          vi.useFakeTimers()
          vi.setSystemTime(nowSpyDate)

          const updatePrnStatuses = vi.fn().mockResolvedValue(null)
          const h = buildH()
          const request = buildAcceptRequest({ updatePrnStatuses })

          await postController.handler(request, h)

          expect(updatePrnStatuses).toHaveBeenCalledTimes(1)
          expect(updatePrnStatuses.mock.calls[0][1].prnIds).toEqual([
            prnId,
            otherPrnId
          ])
          expect(request.store.get(acceptedSessionKey)).toEqual([
            { material: 'Plastic', tonnage: 75, acceptanceYear: 2026 },
            { material: 'Steel', tonnage: 40, acceptanceYear: 2026 }
          ])
          expect(h.redirect).toHaveBeenCalledWith(
            `${acceptedSelectionPath}?year=2026`
          )

          vi.useRealTimers()
        })

        test('shows the confirmation when a duplicate accept finds the selection already accepted for the same year', async () => {
          vi.useFakeTimers()
          vi.setSystemTime(nowSpyDate)

          const updatePrnStatuses = vi.fn()
          const h = buildH()
          const request = buildAcceptRequest({
            updatePrnStatuses,
            getPrn: vi.fn(async (_id, prnIdToRead) =>
              buildPrn({
                id: prnIdToRead,
                status: 'Accepted',
                obligationYear: 2026
              })
            )
          })

          await postController.handler(request, h)

          expect(updatePrnStatuses).not.toHaveBeenCalled()
          expect(request.store.get(acceptedSessionKey)).toEqual([
            { material: 'Plastic', tonnage: 75, acceptanceYear: 2026 },
            { material: 'Steel', tonnage: 40, acceptanceYear: 2026 }
          ])
          expect(request.store.has(sessionKey)).toBe(false)
          expect(h.redirect).toHaveBeenCalledWith(
            `${acceptedSelectionPath}?year=2026`
          )

          vi.useRealTimers()
        })

        test('does not confirm an accept when the selection was accepted into a different year', async () => {
          vi.useFakeTimers()
          vi.setSystemTime(nowSpyDate)

          const updatePrnStatuses = vi.fn()
          const request = buildAcceptRequest({
            updatePrnStatuses,
            getPrn: vi.fn(async (_id, prnIdToRead) =>
              buildPrn({
                id: prnIdToRead,
                status: 'Accepted',
                obligationYear: 2027
              })
            )
          })

          const error = await postController
            .handler(request, buildH())
            .catch((thrown) => thrown)

          expect(error.output.statusCode).toBe(statusCodes.internalServerError)
          expect(updatePrnStatuses).not.toHaveBeenCalled()
          expect(request.store.has(acceptedSessionKey)).toBe(false)

          vi.useRealTimers()
        })

        test('does not confirm an accept when only some of the selection is accepted', async () => {
          vi.useFakeTimers()
          vi.setSystemTime(nowSpyDate)

          const updatePrnStatuses = vi.fn()
          const request = buildAcceptRequest({
            updatePrnStatuses,
            getPrn: vi.fn(async (_id, prnIdToRead) =>
              prnIdToRead === prnId
                ? buildPrn({
                    id: prnId,
                    status: 'Accepted',
                    obligationYear: 2026
                  })
                : buildPrn({ id: prnIdToRead, obligationYear: 2026 })
            )
          })

          const error = await postController
            .handler(request, buildH())
            .catch((thrown) => thrown)

          expect(error.output.statusCode).toBe(statusCodes.internalServerError)
          expect(updatePrnStatuses).not.toHaveBeenCalled()
          expect(request.store.has(acceptedSessionKey)).toBe(false)

          vi.useRealTimers()
        })

        test('removes a PRN that is no longer selectable and throws a 500 without accepting', async () => {
          vi.useFakeTimers()
          vi.setSystemTime(nowSpyDate)

          const updatePrnStatuses = vi.fn()
          const h = buildH()
          const request = buildAcceptRequest({ updatePrnStatuses }, [
            buildPrn({ id: stalePrnId, number: 'PRN789', status: 'Accepted' })
          ])

          const error = await postController
            .handler(request, h)
            .catch((thrown) => thrown)

          expect(error.output.statusCode).toBe(statusCodes.internalServerError)
          expect(updatePrnStatuses).not.toHaveBeenCalled()
          expect(request.store.get(sessionKey)).toEqual([prnId, otherPrnId])
          expect(
            request.store.get(dataSessionKey).map((prn) => prn.id)
          ).toEqual([prnId, otherPrnId])
          expect(request.store.has(acceptedSessionKey)).toBe(false)
          expect(request.logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('removedCount=1')
          )
          expect(h.redirect).not.toHaveBeenCalled()

          vi.useRealTimers()
        })

        test('removes every PRN when none is selectable any more and throws a 500', async () => {
          vi.useFakeTimers()
          vi.setSystemTime(nowSpyDate)

          const updatePrnStatuses = vi.fn()
          const request = buildRequest({
            selectedIds: [stalePrnId],
            prnsData: [buildPrn({ id: stalePrnId, status: 'Accepted' })],
            query: { year: 2026 },
            payload: { accept: 'true' },
            wasteObligationsApi: { updatePrnStatuses }
          })

          const error = await postController
            .handler(request, buildH())
            .catch((thrown) => thrown)

          expect(error.output.statusCode).toBe(statusCodes.internalServerError)
          expect(updatePrnStatuses).not.toHaveBeenCalled()
          expect(request.store.has(sessionKey)).toBe(false)
          expect(request.store.has(dataSessionKey)).toBe(false)

          vi.useRealTimers()
        })

        test('carries the stored list query to the confirmation, as Go back does', async () => {
          vi.useFakeTimers()
          vi.setSystemTime(nowSpyDate)

          const h = buildH()
          const request = buildAcceptRequest({
            updatePrnStatuses: vi.fn().mockResolvedValue(null)
          })
          request.store.set(listQuerySessionKey, {
            year: 2026,
            sort: 'TonnageDescending',
            material: 'Plastic'
          })

          await postController.handler(request, h)

          expect(h.redirect).toHaveBeenCalledWith(
            `${acceptedSelectionPath}?year=2026&sort=TonnageDescending&material=Plastic`
          )
          expect(request.store.has(listQuerySessionKey)).toBe(false)

          vi.useRealTimers()
        })

        test('clears the selection, stores nothing for the confirmation and throws a 404 when a selected PRN no longer exists', async () => {
          vi.useFakeTimers()
          vi.setSystemTime(nowSpyDate)

          const updatePrnStatuses = vi
            .fn()
            .mockRejectedValue(
              new ApiError({ status: statusCodes.notFound, message: 'changed' })
            )
          const h = buildH()
          const request = buildAcceptRequest({ updatePrnStatuses })

          const error = await postController
            .handler(request, h)
            .catch((thrown) => thrown)

          expect(error.output.statusCode).toBe(statusCodes.notFound)
          expect(request.store.has(sessionKey)).toBe(false)
          expect(request.store.has(dataSessionKey)).toBe(false)
          expect(request.store.has(acceptedSessionKey)).toBe(false)
          expect(h.redirect).not.toHaveBeenCalled()
          expect(h.view).not.toHaveBeenCalled()

          vi.useRealTimers()
        })

        test.each([
          ['conflict', statusCodes.conflict],
          ['gone', statusCodes.gone],
          ['unprocessable', statusCodes.unprocessableEntity]
        ])(
          'clears the selection and throws a 500 when the API reports a %s',
          async (_name, status) => {
            vi.useFakeTimers()
            vi.setSystemTime(nowSpyDate)

            const h = buildH()
            const request = buildAcceptRequest({
              updatePrnStatuses: vi
                .fn()
                .mockRejectedValue(new ApiError({ status, message: 'changed' }))
            })
            request.store.set(listQuerySessionKey, { year: 2026 })

            const error = await postController
              .handler(request, h)
              .catch((thrown) => thrown)

            expect(error.output.statusCode).toBe(
              statusCodes.internalServerError
            )
            expect(request.store.has(sessionKey)).toBe(false)
            expect(request.store.has(dataSessionKey)).toBe(false)
            expect(request.store.has(listQuerySessionKey)).toBe(false)
            expect(request.store.has(acceptedSessionKey)).toBe(false)
            expect(h.redirect).not.toHaveBeenCalled()

            vi.useRealTimers()
          }
        )

        test('keeps the selection and stores nothing for the confirmation when the update fails', async () => {
          vi.useFakeTimers()
          vi.setSystemTime(nowSpyDate)

          const updatePrnStatuses = vi
            .fn()
            .mockRejectedValue(new ApiError({ status: 500, message: 'boom' }))
          const h = buildH()
          const request = buildAcceptRequest({ updatePrnStatuses })

          await expect(postController.handler(request, h)).rejects.toThrow()

          expect(request.store.get(sessionKey)).toEqual([prnId, otherPrnId])
          expect(request.store.has(acceptedSessionKey)).toBe(false)
          expect(h.redirect).not.toHaveBeenCalled()

          vi.useRealTimers()
        })
      })

      test('going back clears the stored selection and redirects to the list', async () => {
        const h = buildH()
        const request = buildRequest({
          selectedIds: [prnId, otherPrnId],
          prnsData: [buildPrn(), buildPrn({ id: otherPrnId })],
          listQuery: { year: 2026 },
          query: { year: 2026 },
          payload: { goBack: 'true' }
        })

        await postController.handler(request, h)

        expect(request.store.has(sessionKey)).toBe(false)
        expect(request.store.has(dataSessionKey)).toBe(false)
        expect(request.store.has(listQuerySessionKey)).toBe(false)
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
