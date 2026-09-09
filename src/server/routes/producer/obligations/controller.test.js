import { describe, expect, test, vi } from 'vitest'

import { config } from '#/config/config.js'
import { obligationsHomeController } from './controller.js'
import { producer } from '../index.js'

vi.mock(
  '#/server/routes/_shared/obligations/view-model/manage-obligations-view-model.js',
  () => ({
    buildManageObligationsViewModel: vi.fn(() => ({
      page: 'manage-obligations'
    }))
  })
)

const { buildManageObligationsViewModel } =
  await import('#/server/routes/_shared/obligations/view-model/manage-obligations-view-model.js')

describe('producer obligationsHomeController', () => {
  test('renders the manage obligations view for the query year', () => {
    const request = {
      query: { year: 2025 },
      params: { organisationId: 'd8f98659-87d8-4ef4-a9f2-e72f1bc98423' }
    }
    const h = { view: vi.fn((viewName, model) => ({ viewName, model })) }

    const result = obligationsHomeController.handler(request, h)

    expect(buildManageObligationsViewModel).toHaveBeenCalledWith({
      request,
      userType: 'producer',
      obligationYear: 2025
    })
    expect(h.view).toHaveBeenCalledWith(
      '_shared/obligations/views/obligations-home',
      { page: 'manage-obligations' }
    )
    expect(result.viewName).toBe('_shared/obligations/views/obligations-home')
  })

  test('defaults obligation year to the current year', () => {
    const request = {
      query: {},
      params: { organisationId: 'd8f98659-87d8-4ef4-a9f2-e72f1bc98423' }
    }
    const h = { view: vi.fn() }

    obligationsHomeController.handler(request, h)

    expect(buildManageObligationsViewModel).toHaveBeenCalledWith(
      expect.objectContaining({
        obligationYear: new Date().getFullYear()
      })
    )
  })
})

describe('producer plugin obligations registration', () => {
  test('registers obligations routes when the feature flag is enabled', () => {
    const previous = config.get('features.manageObligations')
    config.set('features.manageObligations', true)
    const server = { route: vi.fn() }

    try {
      producer.plugin.register(server)

      const registeredPaths = server.route.mock.calls[0][0].map(
        (route) => route.path
      )
      expect(registeredPaths).toContain(
        '/producer/{organisationId}/obligations'
      )
    } finally {
      config.set('features.manageObligations', previous)
    }
  })

  test('omits obligations routes when the feature flag is disabled', () => {
    const previous = config.get('features.manageObligations')
    config.set('features.manageObligations', false)
    const server = { route: vi.fn() }

    try {
      producer.plugin.register(server)

      const registeredPaths = server.route.mock.calls[0][0].map(
        (route) => route.path
      )
      expect(registeredPaths).not.toContain(
        '/producer/{organisationId}/obligations'
      )
    } finally {
      config.set('features.manageObligations', previous)
    }
  })
})
