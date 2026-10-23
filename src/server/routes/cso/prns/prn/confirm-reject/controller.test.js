import { describe, expect, test } from 'vitest'

import { currentComplianceScheme } from '#/server/routes/_shared/compliance/_middlewares/current-compliance-scheme.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import * as csoPrnMiddlewares from '#/server/routes/cso/_middlewares/index.js'
import { prnRouteOptions } from '#/server/routes/_shared/prns/prns-route-options.js'
import {
  prnConfirmRejectController,
  prnConfirmRejectRoutes
} from './controller.js'

// Behaviour is covered once in
// _shared/prns/prn-confirm-reject-routes.test.js; this file only asserts the
// CSO-specific wiring passed to the factory.
describe('cso prn confirm-reject routes', () => {
  test('exports the GET controller', () => {
    expect(prnConfirmRejectRoutes).toEqual([prnConfirmRejectController])
  })

  test('is mounted under /cso/{schemeId}/prns/{prnId}/confirm-reject', () => {
    expect(prnConfirmRejectController.method).toBe('GET')
    expect(prnConfirmRejectController.path).toBe(
      '/cso/{schemeId}/prns/{prnId}/confirm-reject'
    )
  })

  test('reuses the shared PRN route options', () => {
    expect(prnConfirmRejectController.options.validate).toBe(
      prnRouteOptions.validate
    )
  })

  test('loads the PRN before the handler, without the unused organisation pre-handler', () => {
    expect(prnConfirmRejectController.options.pre).toEqual([
      currentComplianceScheme,
      approvedUser,
      csoPrnMiddlewares.prn
    ])
  })
})
