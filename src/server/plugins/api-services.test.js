import { describe, test, expect, vi, beforeEach } from 'vitest'

const configGetMock = vi.hoisted(() => vi.fn())
const createBackendAccountApiService = vi.hoisted(() =>
  vi.fn(() => ({ service: 'backend-account' }))
)
const createWasteOrganisationsApiService = vi.hoisted(() =>
  vi.fn(() => ({ service: 'organisations' }))
)
const createWasteObligationsApiService = vi.hoisted(() =>
  vi.fn(() => ({ service: 'obligations' }))
)

vi.mock('#/config/config.js', () => ({
  config: {
    get: configGetMock
  }
}))

vi.mock('#/server/services/backend-account-api.service.js', () => ({
  createBackendAccountApiService
}))

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
    configGetMock.mockReset()
    configGetMock.mockImplementation((key) => key === 'isTest' && false)
    createBackendAccountApiService.mockClear()
    createWasteOrganisationsApiService.mockClear()
    createWasteObligationsApiService.mockClear()
  })

  test('register wires API clients on server.app', async () => {
    const redisClient = { get: vi.fn(), set: vi.fn() }
    const server = createServerStub()
    server.app.redisClient = redisClient
    await apiServices.register(server)

    expect(createBackendAccountApiService).toHaveBeenCalledWith({
      cacheClient: redisClient
    })
    expect(createWasteOrganisationsApiService).toHaveBeenCalledWith()
    expect(createWasteObligationsApiService).toHaveBeenCalledWith()
    expect(server.app.backendAccountApi).toEqual({ service: 'backend-account' })
    expect(server.app.wasteOrganisationsApi).toEqual({
      service: 'organisations'
    })
    expect(server.app.wasteObligationsApi).toEqual({ service: 'obligations' })
  })

  test('register uses mock backend account API in test environment', async () => {
    configGetMock.mockImplementation((key) => key === 'isTest' && true)

    const server = createServerStub()
    await apiServices.register(server)

    expect(createBackendAccountApiService).not.toHaveBeenCalled()
    expect(server.app.backendAccountApi.getUserOrganisations).toBeDefined()
  })
})
