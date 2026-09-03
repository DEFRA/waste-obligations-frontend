import { describe, expect, test } from 'vitest'

import { currentComplianceScheme } from '#/server/routes/compliance/_middlewares/current-compliance-scheme.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import * as organisationsMiddlewares from '#/server/routes/organisations/cso/_middlewares/index.js'
import { organisationsPrnRouteOptions } from '#/server/routes/organisations/_shared/organisations-route-options.js'
import {
  prnConfirmAcceptController,
  prnConfirmAcceptPostController,
  prnConfirmAcceptRoutes
} from './controller.js'

// Behaviour is covered once in
// _shared/prn-confirm-accept-routes.test.js; this file only asserts the
// CSO-specific wiring passed to the factory.
describe('CSO prn confirm-accept routes', () => {
  test('exports the GET then POST controller', () => {
    expect(prnConfirmAcceptRoutes).toEqual([
      prnConfirmAcceptController,
      prnConfirmAcceptPostController
    ])
  })

  test('is mounted under /organisations/cso/{schemeId}/prns/{prnId}/confirm-accept', () => {
    expect(prnConfirmAcceptController.method).toBe('GET')
    expect(prnConfirmAcceptPostController.method).toBe('POST')
    expect(prnConfirmAcceptController.path).toBe(
      '/organisations/cso/{schemeId}/prns/{prnId}/confirm-accept'
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

  test('runs currentComplianceScheme and approvedUser, then loads the PRN (no unused organisation pre-handler)', () => {
    expect(prnConfirmAcceptController.options.pre).toEqual([
      currentComplianceScheme,
      approvedUser,
      organisationsMiddlewares.prn
    ])
  })
})
