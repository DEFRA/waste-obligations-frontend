import { describe, expect, test } from 'vitest'

import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import * as organisationsMiddlewares from '#/server/routes/organisations/producer/_middlewares/index.js'
import { organisationsPrnRouteOptions } from '#/server/routes/organisations/_shared/organisations-route-options.js'
import {
  prnConfirmAcceptController,
  prnConfirmAcceptPostController,
  prnConfirmAcceptRoutes
} from './controller.js'

// Behaviour is covered once in
// _shared/prn-confirm-accept-routes.test.js; this file only asserts the
// producer-specific wiring passed to the factory.
describe('producer prn confirm-accept routes', () => {
  test('exports the GET then POST controller', () => {
    expect(prnConfirmAcceptRoutes).toEqual([
      prnConfirmAcceptController,
      prnConfirmAcceptPostController
    ])
  })

  test('is mounted under /organisations/producer/{organisationId}/prns/{prnId}/confirm-accept', () => {
    expect(prnConfirmAcceptController.method).toBe('GET')
    expect(prnConfirmAcceptPostController.method).toBe('POST')
    expect(prnConfirmAcceptController.path).toBe(
      '/organisations/producer/{organisationId}/prns/{prnId}/confirm-accept'
    )
    expect(prnConfirmAcceptPostController.path).toBe(
      prnConfirmAcceptController.path
    )
  })

  test('reuses the shared organisations route options', () => {
    expect(prnConfirmAcceptController.options.validate).toBe(
      organisationsPrnRouteOptions.validate
    )
  })

  test('loads the PRN before the handler, without the unused organisation pre-handler', () => {
    expect(prnConfirmAcceptController.options.pre).toEqual([
      currentOrganisation,
      approvedUser,
      organisationsMiddlewares.prn
    ])
  })
})
