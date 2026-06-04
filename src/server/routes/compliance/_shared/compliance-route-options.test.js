import { describe, expect, test } from 'vitest'

import { currentOrganisation } from '../_middlewares/current-organisation.js'
import { certificateRoutes } from '../certificate/controller.js'
import { certificateSubmitRoutes } from '../certificate-submit/controller.js'
import { certificateSuccessRoutes } from '../certificate-success/controller.js'
import { statementRoutes } from '../statement/controller.js'

const complianceRoutes = [
  ...certificateRoutes,
  ...certificateSubmitRoutes,
  ...certificateSuccessRoutes,
  ...statementRoutes
]

function includesCurrentOrganisation(preHandlers = []) {
  return preHandlers.some(
    (handler) =>
      handler === currentOrganisation ||
      handler?.assign === currentOrganisation.assign
  )
}

describe('compliance route options', () => {
  test.each(complianceRoutes.map(({ method, path }) => [method, path]))(
    '%s %s includes currentOrganisation in pre chain',
    (method, path) => {
      const route = complianceRoutes.find(
        (entry) => entry.method === method && entry.path === path
      )

      expect(includesCurrentOrganisation(route.options.pre)).toBe(true)
    }
  )
})
