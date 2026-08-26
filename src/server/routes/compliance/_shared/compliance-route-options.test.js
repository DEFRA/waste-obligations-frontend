import { describe, expect, test } from 'vitest'

import { approvedUser } from '../../../common/routes/middleware/approved-user.js'
import { currentOrganisation } from '../../../common/routes/middleware/current-organisation.js'
import { currentComplianceScheme } from '../_middlewares/current-compliance-scheme.js'
import { organisation } from '../../../common/routes/middleware/organisation.js'
import { certificateRoutes } from '../producer/certificate/controller.js'
import { certificateSubmitRoutes } from '../producer/certificate-submit/controller.js'
import { certificateSuccessRoutes } from '../producer/certificate-success/controller.js'
import { certificateViewRoutes } from '../producer/certificate-view/controller.js'
import { statementRoutes } from '../cso/statement/controller.js'
import { statementSubmitRoutes } from '../cso/statement-submit/controller.js'
import { statementSuccessRoutes } from '../cso/statement-success/controller.js'
import { statementViewRoutes } from '../cso/statement-view/controller.js'

const restrictedProducerRoutes = [
  ...certificateRoutes,
  ...certificateSubmitRoutes,
  ...certificateSuccessRoutes
]

const viewOnlyProducerRoutes = [...certificateViewRoutes]

const restrictedCsoRoutes = [
  ...statementRoutes,
  ...statementSubmitRoutes,
  ...statementSuccessRoutes
]

const viewOnlyCsoRoutes = [...statementViewRoutes]

function includesPreHandler(preHandlers = [], target) {
  return preHandlers.some(
    (handler) => handler === target || handler?.assign === target.assign
  )
}

describe('compliance route options', () => {
  const producerRoutes = [
    ...restrictedProducerRoutes,
    ...viewOnlyProducerRoutes
  ]

  test.each(producerRoutes.map(({ method, path }) => [method, path]))(
    '%s %s includes currentOrganisation in pre chain',
    (method, path) => {
      const route = producerRoutes.find(
        (entry) => entry.method === method && entry.path === path
      )

      expect(includesPreHandler(route.options.pre, currentOrganisation)).toBe(
        true
      )
    }
  )

  test.each(
    [
      ...statementRoutes,
      ...statementSubmitRoutes,
      ...statementSuccessRoutes,
      ...statementViewRoutes
    ].map(({ method, path }) => [method, path])
  )('%s %s includes currentComplianceScheme in pre chain', (method, path) => {
    const route = [
      ...statementRoutes,
      ...statementSubmitRoutes,
      ...statementSuccessRoutes,
      ...statementViewRoutes
    ].find((entry) => entry.method === method && entry.path === path)

    expect(includesPreHandler(route.options.pre, currentComplianceScheme)).toBe(
      true
    )
  })

  test.each(statementRoutes.map(({ method, path }) => [method, path]))(
    '%s %s includes organisation in pre chain',
    (method, path) => {
      const route = statementRoutes.find(
        (entry) => entry.method === method && entry.path === path
      )

      expect(includesPreHandler(route.options.pre, organisation)).toBe(true)
    }
  )

  test.each(
    statementSubmitRoutes
      .filter(({ method }) => method === 'GET')
      .map(({ method, path }) => [method, path])
  )('%s %s includes organisation in pre chain', (method, path) => {
    const route = statementSubmitRoutes.find(
      (entry) => entry.method === method && entry.path === path
    )

    expect(includesPreHandler(route.options.pre, organisation)).toBe(true)
  })

  test.each(restrictedProducerRoutes.map(({ method, path }) => [method, path]))(
    '%s %s includes approvedUser in pre chain',
    (method, path) => {
      const route = restrictedProducerRoutes.find(
        (entry) => entry.method === method && entry.path === path
      )

      expect(includesPreHandler(route.options.pre, approvedUser)).toBe(true)
    }
  )

  test.each(viewOnlyProducerRoutes.map(({ method, path }) => [method, path]))(
    '%s %s does not include approvedUser in pre chain',
    (method, path) => {
      const route = viewOnlyProducerRoutes.find(
        (entry) => entry.method === method && entry.path === path
      )

      expect(includesPreHandler(route.options.pre, approvedUser)).toBe(false)
    }
  )

  test.each(restrictedCsoRoutes.map(({ method, path }) => [method, path]))(
    '%s %s includes approvedUser in pre chain',
    (method, path) => {
      const route = restrictedCsoRoutes.find(
        (entry) => entry.method === method && entry.path === path
      )

      expect(includesPreHandler(route.options.pre, approvedUser)).toBe(true)
    }
  )

  test.each(viewOnlyCsoRoutes.map(({ method, path }) => [method, path]))(
    '%s %s does not include approvedUser in pre chain',
    (method, path) => {
      const route = viewOnlyCsoRoutes.find(
        (entry) => entry.method === method && entry.path === path
      )

      expect(includesPreHandler(route.options.pre, approvedUser)).toBe(false)
    }
  )
})
