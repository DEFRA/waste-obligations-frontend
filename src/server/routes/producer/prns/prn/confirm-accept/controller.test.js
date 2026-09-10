import { describe, expect, test } from 'vitest'

import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import * as producerPrnMiddlewares from '#/server/routes/producer/_middlewares/index.js'
import { prnRouteOptions } from '#/server/routes/_shared/prns/prns-route-options.js'
import {
  prnConfirmAcceptController,
  prnConfirmAcceptPostController,
  prnConfirmAcceptRoutes
} from './controller.js'

// Behaviour is covered once in
// _shared/prns/prn-confirm-accept-routes.test.js; this file only asserts the
// producer-specific wiring passed to the factory.
describe('producer prn confirm-accept routes', () => {
  test('exports the GET then POST controller', () => {
    expect(prnConfirmAcceptRoutes).toEqual([
      prnConfirmAcceptController,
      prnConfirmAcceptPostController
    ])
  })

  test('is mounted under /producer/{organisationId}/prns/{prnId}/confirm-accept', () => {
    expect(prnConfirmAcceptController.method).toBe('GET')
    expect(prnConfirmAcceptPostController.method).toBe('POST')
    expect(prnConfirmAcceptController.path).toBe(
      '/producer/{organisationId}/prns/{prnId}/confirm-accept'
    )
    expect(prnConfirmAcceptPostController.path).toBe(
      prnConfirmAcceptController.path
    )
  })

  test('reuses the shared PRN route options', () => {
    expect(prnConfirmAcceptController.options.validate).toBe(
      prnRouteOptions.validate
    )
  })

  test('loads the PRN before the handler, without the unused organisation pre-handler', () => {
    expect(prnConfirmAcceptController.options.pre).toEqual([
      currentOrganisation,
      approvedUser,
      producerPrnMiddlewares.prn
    ])
  })
})
