import { describe, expect, test } from 'vitest'

import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import * as producerPrnMiddlewares from '#/server/routes/producer/_middlewares/index.js'
import { prnRouteOptions } from '#/server/routes/_shared/prns/prns-route-options.js'
import {
  prnConfirmRejectController,
  prnConfirmRejectPostController,
  prnConfirmRejectRoutes
} from './controller.js'

// Behaviour is covered once in
// _shared/prns/prn-confirm-reject-routes.test.js; this file only asserts the
// producer-specific wiring passed to the factory.
describe('producer prn confirm-reject routes', () => {
  test('exports the GET then POST controller', () => {
    expect(prnConfirmRejectRoutes).toEqual([
      prnConfirmRejectController,
      prnConfirmRejectPostController
    ])
  })

  test('is mounted under /producer/{organisationId}/prns/{prnId}/confirm-reject', () => {
    expect(prnConfirmRejectController.method).toBe('GET')
    expect(prnConfirmRejectPostController.method).toBe('POST')
    expect(prnConfirmRejectController.path).toBe(
      '/producer/{organisationId}/prns/{prnId}/confirm-reject'
    )
    expect(prnConfirmRejectPostController.path).toBe(
      prnConfirmRejectController.path
    )
  })

  test('reuses the shared PRN route options', () => {
    expect(prnConfirmRejectController.options.validate).toBe(
      prnRouteOptions.validate
    )
  })

  test('loads the PRN before the handler, without the unused organisation pre-handler', () => {
    expect(prnConfirmRejectController.options.pre).toEqual([
      currentOrganisation,
      approvedUser,
      producerPrnMiddlewares.prn
    ])
  })
})
