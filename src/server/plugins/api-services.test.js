import { describe, test, expect, vi, beforeEach } from 'vitest'

const buildRedisClient = vi.hoisted(() => vi.fn())
const createWasteOrganisationsApiService = vi.hoisted(() =>
  vi.fn(() => ({ service: 'organisations' }))
)
const createWasteObligationsApiService = vi.hoisted(() =>
  vi.fn(() => ({ service: 'obligations' }))
)

vi.mock('#/config/config.js', () => ({
  config: {
    get: vi.fn()
  }
}))

vi.mock('#/server/common/helpers/redis-client.js', () => ({
  buildRedisClient
}))

vi.mock('#/server/services/waste-organisations-api.service.js', () => ({
  createWasteOrganisationsApiService
}))

vi.mock('#/server/services/waste-obligations-api.service.js', () => ({
  createWasteObligationsApiService
}))

import { config } from '#/config/config.js'
import { apiServices } from './api-services.js'

function createServerStub() {
  const listeners = {}
  return {
    app: {},
    events: {
      on(event, fn) {
        listeners[event] = fn
      }
    },
    emitStop() {
      return listeners.stop?.()
    }
  }
}

describe('api-services plugin', () => {
  beforeEach(() => {
    vi.mocked(config.get).mockImplementation((key) => {
      if (key === 'apiHttpCache.ttl') {
        return 42_000
      }
      if (key === 'redis') {
        return { host: '127.0.0.1' }
      }
      return undefined
    })
    buildRedisClient.mockReset()
    createWasteOrganisationsApiService.mockClear()
    createWasteObligationsApiService.mockClear()
  })

  test('register wires Redis client, APIs, and stop handler quits Redis', async () => {
    const quit = vi.fn().mockResolvedValue('OK')
    const cacheClient = { quit }
    buildRedisClient.mockReturnValue(cacheClient)

    const server = createServerStub()
    apiServices.register(server)

    expect(buildRedisClient).toHaveBeenCalledWith({ host: '127.0.0.1' })
    expect(server.app.apiHttpCacheRedis).toBe(cacheClient)
    expect(createWasteOrganisationsApiService).toHaveBeenCalledWith({
      cacheClient,
      cacheTtlMs: 42_000
    })
    expect(createWasteObligationsApiService).toHaveBeenCalledWith({
      cacheClient,
      cacheTtlMs: 42_000
    })
    expect(server.app.wasteOrganisationsApi).toEqual({
      service: 'organisations'
    })
    expect(server.app.wasteObligationsApi).toEqual({ service: 'obligations' })

    await server.emitStop()
    expect(quit).toHaveBeenCalledTimes(1)
  })

  test('stop handler does nothing when Redis client has no quit', () => {
    buildRedisClient.mockReturnValue({})

    const server = createServerStub()
    apiServices.register(server)

    server.emitStop()
    expect(server.app.apiHttpCacheRedis).toEqual({})
  })

  test('stop handler swallows quit rejection', async () => {
    const quit = vi.fn().mockRejectedValue(new Error('redis closed'))
    buildRedisClient.mockReturnValue({ quit })

    const server = createServerStub()
    apiServices.register(server)

    server.emitStop()
    await Promise.resolve()
    await Promise.resolve()
    expect(quit).toHaveBeenCalled()
  })
})
