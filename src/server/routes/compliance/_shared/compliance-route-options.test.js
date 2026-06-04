import { describe, expect, test } from 'vitest'

import { organisationAccess } from '../_middlewares/organisation-access.js'
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

function includesOrganisationAccess(preHandlers = []) {
  return preHandlers.some(
    (handler) =>
      handler === organisationAccess ||
      handler?.assign === organisationAccess.assign
  )
}

describe('compliance route options', () => {
  test.each(complianceRoutes.map(({ method, path }) => [method, path]))(
    '%s %s includes organisationAccess in pre chain',
    (method, path) => {
      const route = complianceRoutes.find(
        (entry) => entry.method === method && entry.path === path
      )

      expect(includesOrganisationAccess(route.options.pre)).toBe(true)
    }
  )
})
