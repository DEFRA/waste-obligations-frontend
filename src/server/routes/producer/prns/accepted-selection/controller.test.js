import { describe, expect, test } from 'vitest'

import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import {
  prnsAcceptedSelectionController,
  prnsAcceptedSelectionRoutes
} from './controller.js'

// Behaviour is covered once in
// _shared/prns/prns-accepted-selection-routes.test.js; this file only asserts
// the producer-specific wiring passed to the factory.
describe('producer PRNs accepted-selection route', () => {
  test('exports the GET controller', () => {
    expect(prnsAcceptedSelectionRoutes).toEqual([
      prnsAcceptedSelectionController
    ])
    expect(prnsAcceptedSelectionController.method).toBe('GET')
  })

  test('is mounted under /producer/{organisationId}/prns/accepted-selection', () => {
    expect(prnsAcceptedSelectionController.path).toBe(
      '/producer/{organisationId}/prns/accepted-selection'
    )
  })

  test('only runs currentOrganisation and approvedUser before the handler', () => {
    expect(prnsAcceptedSelectionController.options.pre).toEqual([
      currentOrganisation,
      approvedUser
    ])
  })
})
