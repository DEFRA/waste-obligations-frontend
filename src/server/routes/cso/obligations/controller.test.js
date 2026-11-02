import { describe, expect, test, vi } from 'vitest'

import { config } from '#/config/config.js'
import {
  obligationMaterialController,
  obligationsHomeController
} from './controller.js'
import { cso } from '../index.js'

vi.mock(
  '#/server/routes/_shared/obligations/view-model/material-calculation-view-model.js',
  () => ({
    buildMaterialCalculationViewModel: vi.fn(() => ({
      page: 'material-calculation'
    }))
  })
)

vi.mock(
  '#/server/routes/_shared/obligations/view-model/manage-obligations-view-model.js',
  () => ({
    buildManageObligationsViewModel: vi.fn(() => ({
      page: 'manage-obligations'
    }))
  })
)

const { buildMaterialCalculationViewModel } =
  await import('#/server/routes/_shared/obligations/view-model/material-calculation-view-model.js')
const { buildManageObligationsViewModel } =
  await import('#/server/routes/_shared/obligations/view-model/manage-obligations-view-model.js')

describe('cso obligationsHomeController', () => {
  test('renders the manage obligations view for the query year', () => {
    const request = {
      query: { year: 2025 },
      params: { schemeId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890' }
    }
    const h = { view: vi.fn((viewName, model) => ({ viewName, model })) }

    const result = obligationsHomeController.handler(request, h)

    expect(buildManageObligationsViewModel).toHaveBeenCalledWith({
      request,
      userType: 'cso',
      obligationYear: 2025
    })
    expect(h.view).toHaveBeenCalledWith(
      '_shared/obligations/views/obligations-home',
      { page: 'manage-obligations' }
    )
    expect(result.viewName).toBe('_shared/obligations/views/obligations-home')
  })
})

describe('cso obligationMaterialController', () => {
  test('renders the material calculation view for the material and year', () => {
    const request = {
      query: { year: 2025 },
      params: {
        schemeId: 'd8f98659-87d8-4ef4-a9f2-e72f1bc98423',
        material: 'glass'
      }
    }
    const h = { view: vi.fn((viewName, model) => ({ viewName, model })) }

    const result = obligationMaterialController.handler(request, h)

    expect(buildMaterialCalculationViewModel).toHaveBeenCalledWith({
      request,
      userType: 'cso',
      obligationYear: 2025,
      material: 'glass'
    })
    expect(h.view).toHaveBeenCalledWith(
      '_shared/obligations/views/obligation-material',
      { page: 'material-calculation' }
    )
    expect(result.viewName).toBe(
      '_shared/obligations/views/obligation-material'
    )
  })
})

describe('cso plugin obligations registration', () => {
  test('registers obligations routes when the feature flag is enabled', () => {
    const previous = config.get('features.manageObligations')
    config.set('features.manageObligations', true)
    const server = { route: vi.fn() }

    try {
      cso.plugin.register(server)

      const registeredPaths = server.route.mock.calls[0][0].map(
        (route) => route.path
      )
      expect(registeredPaths).toContain('/cso/{schemeId}/obligations')
    } finally {
      config.set('features.manageObligations', previous)
    }
  })

  test('omits obligations routes when the feature flag is disabled', () => {
    const previous = config.get('features.manageObligations')
    config.set('features.manageObligations', false)
    const server = { route: vi.fn() }

    try {
      cso.plugin.register(server)

      const registeredPaths = server.route.mock.calls[0][0].map(
        (route) => route.path
      )
      expect(registeredPaths).not.toContain('/cso/{schemeId}/obligations')
    } finally {
      config.set('features.manageObligations', previous)
    }
  })
})
