import { describe, test, expect, vi, beforeEach } from 'vitest'

const buildRedisClient = vi.hoisted(() => vi.fn())

vi.mock('#/config/config.js', () => ({
  config: {
    get: vi.fn()
  }
}))

vi.mock('#/server/common/helpers/redis-client.js', () => ({
  buildRedisClient
}))

import { config } from '#/config/config.js'
import { redisServices } from './redis-services.js'

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

describe('redis-services plugin', () => {
  beforeEach(() => {
    vi.mocked(config.get).mockImplementation((key) => {
      if (key === 'redis') {
        return { host: '127.0.0.1' }
      }
      return undefined
    })
    buildRedisClient.mockReset()
  })

  test('register wires Redis client and stop handler quits Redis', async () => {
    const quit = vi.fn().mockResolvedValue('OK')
    const cacheClient = { quit }
    buildRedisClient.mockReturnValue(cacheClient)

    const server = createServerStub()
    redisServices.register(server)

    expect(buildRedisClient).toHaveBeenCalledWith({ host: '127.0.0.1' })
    expect(server.app.redisClient).toBe(cacheClient)

    await server.emitStop()
    expect(quit).toHaveBeenCalledTimes(1)
  })

  test('stop handler does nothing when Redis client has no quit', () => {
    buildRedisClient.mockReturnValue({})

    const server = createServerStub()
    redisServices.register(server)

    server.emitStop()
    expect(server.app.redisClient).toEqual({})
  })

  test('stop handler swallows quit rejection', async () => {
    const quit = vi.fn().mockRejectedValue(new Error('redis closed'))
    buildRedisClient.mockReturnValue({ quit })

    const server = createServerStub()
    redisServices.register(server)

    server.emitStop()
    await Promise.resolve()
    await Promise.resolve()
    expect(quit).toHaveBeenCalled()
  })
})
