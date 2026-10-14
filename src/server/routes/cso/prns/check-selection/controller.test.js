import { describe, expect, test } from 'vitest'

import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import { currentComplianceScheme } from '#/server/routes/_shared/compliance/_middlewares/current-compliance-scheme.js'
import {
  prnsCheckSelectionController,
  prnsCheckSelectionPostController,
  prnsCheckSelectionRoutes
} from './controller.js'

// Behaviour is covered once in
// _shared/prns/prns-check-selection-routes.test.js; this file only asserts the
// CSO-specific wiring passed to the factory.
describe('CSO PRNs check-selection routes', () => {
  test('exports the GET then POST controller', () => {
    expect(prnsCheckSelectionRoutes).toEqual([
      prnsCheckSelectionController,
      prnsCheckSelectionPostController
    ])
  })

  test('is mounted under /cso/{schemeId}/prns/check-selection', () => {
    expect(prnsCheckSelectionController.path).toBe(
      '/cso/{schemeId}/prns/check-selection'
    )
    expect(prnsCheckSelectionPostController.path).toBe(
      prnsCheckSelectionController.path
    )
  })

  test('only runs currentComplianceScheme and approvedUser before the handler', () => {
    expect(prnsCheckSelectionController.options.pre).toEqual([
      currentComplianceScheme,
      approvedUser
    ])
    expect(prnsCheckSelectionPostController.options.pre).toEqual(
      prnsCheckSelectionController.options.pre
    )
  })
})
