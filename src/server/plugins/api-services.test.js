import { describe, test, expect, vi, beforeEach } from 'vitest'

const createWasteOrganisationsApiService = vi.hoisted(() =>
  vi.fn(() => ({ service: 'organisations' }))
)
const createWasteObligationsApiService = vi.hoisted(() =>
  vi.fn(() => ({ service: 'obligations' }))
)

vi.mock('#/server/services/waste-organisations-api.service.js', () => ({
  createWasteOrganisationsApiService
}))

vi.mock('#/server/services/waste-obligations-api.service.js', () => ({
  createWasteObligationsApiService
}))

import { apiServices } from './api-services.js'

function createServerStub() {
  return {
    app: {}
  }
}

describe('api-services plugin', () => {
  beforeEach(() => {
    createWasteOrganisationsApiService.mockClear()
    createWasteObligationsApiService.mockClear()
  })

  test('register wires Waste Organisations and Waste Obligations API clients', () => {
    const server = createServerStub()
    apiServices.register(server)

    expect(createWasteOrganisationsApiService).toHaveBeenCalledWith()
    expect(createWasteObligationsApiService).toHaveBeenCalledWith()
    expect(server.app.wasteOrganisationsApi).toEqual({
      service: 'organisations'
    })
    expect(server.app.wasteObligationsApi).toEqual({ service: 'obligations' })
  })
})
