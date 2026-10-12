import { describe, expect, test } from 'vitest'

import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import {
  prnsCheckSelectionController,
  prnsCheckSelectionPostController,
  prnsCheckSelectionRoutes
} from './controller.js'

// Behaviour is covered once in
// _shared/prns/prns-check-selection-routes.test.js; this file only asserts the
// producer-specific wiring passed to the factory.
describe('producer PRNs check-selection routes', () => {
  test('exports the GET then POST controller', () => {
    expect(prnsCheckSelectionRoutes).toEqual([
      prnsCheckSelectionController,
      prnsCheckSelectionPostController
    ])
  })

  test('is mounted under /producer/{organisationId}/prns/check-selection', () => {
    expect(prnsCheckSelectionController.path).toBe(
      '/producer/{organisationId}/prns/check-selection'
    )
    expect(prnsCheckSelectionPostController.path).toBe(
      prnsCheckSelectionController.path
    )
  })

  test('only runs currentOrganisation and approvedUser before the handler', () => {
    expect(prnsCheckSelectionController.options.pre).toEqual([
      currentOrganisation,
      approvedUser
    ])
    expect(prnsCheckSelectionPostController.options.pre).toEqual(
      prnsCheckSelectionController.options.pre
    )
  })
})
