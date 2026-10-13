import { describe, expect, test } from 'vitest'

import { currentOrganisation } from '#/server/common/routes/middleware/current-organisation.js'
import { approvedUser } from '#/server/common/routes/middleware/approved-user.js'
import * as complianceMiddlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import * as producerPrnMiddlewares from '#/server/routes/producer/_middlewares/index.js'
import { prnsRouteOptions } from '#/server/routes/_shared/prns/prns-route-options.js'
import { prnsListPayloadSchema } from '#/server/routes/_shared/prns/schema.js'
import {
  prnsListController,
  prnsListPostController,
  prnsListRoutes
} from './controller.js'

// Behaviour is covered once in
// _shared/prns/prns-list-routes.test.js; this file only asserts the
// producer-specific wiring passed to the factory.
describe('producer PRNs list routes', () => {
  test('exports the GET then POST controller', () => {
    expect(prnsListRoutes).toEqual([prnsListController, prnsListPostController])
  })

  test('is mounted under /producer/{organisationId}/prns', () => {
    expect(prnsListController.method).toBe('GET')
    expect(prnsListPostController.method).toBe('POST')
    expect(prnsListController.path).toBe('/producer/{organisationId}/prns')
    expect(prnsListPostController.path).toBe(prnsListController.path)
  })

  test('reuses the shared PRNs query validation on GET', () => {
    expect(prnsListController.options.validate).toBe(prnsRouteOptions.validate)
  })

  test('validates the selected PRN payload on POST', () => {
    expect(prnsListPostController.options.validate.params).toBe(
      prnsRouteOptions.validate.params
    )
    expect(prnsListPostController.options.validate.query).toBe(
      prnsRouteOptions.validate.query
    )
    expect(prnsListPostController.options.validate.payload).toBe(
      prnsListPayloadSchema
    )
  })

  test('runs currentOrganisation and approvedUser before loading the organisation and PRNs', () => {
    expect(prnsListController.options.pre).toEqual([
      currentOrganisation,
      approvedUser,
      complianceMiddlewares.organisation,
      producerPrnMiddlewares.prns
    ])
    expect(prnsListPostController.options.pre).toEqual(
      prnsListController.options.pre
    )
  })
})
