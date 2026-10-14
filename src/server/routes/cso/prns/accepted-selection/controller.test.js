import { describe, expect, test } from 'vitest'

import { currentComplianceScheme } from '#/server/routes/_shared/compliance/_middlewares/current-compliance-scheme.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import {
  prnsAcceptedSelectionController,
  prnsAcceptedSelectionRoutes
} from './controller.js'

// Behaviour is covered once in
// _shared/prns/prns-accepted-selection-routes.test.js; this file only asserts
// the cso-specific wiring passed to the factory.
describe('cso PRNs accepted-selection route', () => {
  test('exports the GET controller', () => {
    expect(prnsAcceptedSelectionRoutes).toEqual([
      prnsAcceptedSelectionController
    ])
    expect(prnsAcceptedSelectionController.method).toBe('GET')
  })

  test('is mounted under /cso/{schemeId}/prns/accepted-selection', () => {
    expect(prnsAcceptedSelectionController.path).toBe(
      '/cso/{schemeId}/prns/accepted-selection'
    )
  })

  test('only runs currentComplianceScheme and approvedUser before the handler', () => {
    expect(prnsAcceptedSelectionController.options.pre).toEqual([
      currentComplianceScheme,
      approvedUser
    ])
  })
})
