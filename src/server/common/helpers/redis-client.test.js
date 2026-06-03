import { vi } from 'vitest'

import { Cluster, Redis } from 'ioredis'

import { config } from '../../../config/config.js'
import { buildRedisClient } from './redis-client.js'

const eventHandlers = {}

function mockRedisClient() {
  return {
    on: vi.fn((event, handler) => {
      eventHandlers[event] = handler
      return mockRedisClient()
    })
  }
}

vi.mock('ioredis', () => ({
  ...vi.importActual('ioredis'),
  Cluster: vi.fn(mockRedisClient),
  Redis: vi.fn(mockRedisClient)
}))

const { redisLogger } = vi.hoisted(() => ({
  redisLogger: { info: vi.fn(), error: vi.fn() }
}))

vi.mock('./logging/logger.js', () => ({
  createLogger: vi.fn(() => redisLogger)
}))

describe('#buildRedisClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(eventHandlers)) {
      delete eventHandlers[key]
    }
  })

  describe('When Redis Single InstanceCache is requested', () => {
    beforeEach(() => {
      buildRedisClient(config.get('redis'))
    })

    test('Should instantiate a single Redis client', () => {
      expect(Redis).toHaveBeenCalledWith({
        db: 0,
        host: '127.0.0.1',
        keyPrefix: 'waste-obligations-frontend:',
        port: 6379
      })
    })

    test('logs connect and error events', () => {
      eventHandlers.connect()
      eventHandlers.error(new Error('redis-down'))

      expect(redisLogger.info).toHaveBeenCalledWith('Connected to Redis server')
      expect(redisLogger.error).toHaveBeenCalledWith(
        'Redis connection error Error: redis-down'
      )
    })
  })

  describe('When a Redis Cluster is requested', () => {
    beforeEach(() => {
      buildRedisClient({
        ...config.get('redis'),
        useSingleInstanceCache: false,
        useTLS: true,
        username: 'user',
        password: 'pass'
      })
    })

    test('Should instantiate a Redis Cluster client', () => {
      expect(Cluster).toHaveBeenCalledWith(
        [{ host: '127.0.0.1', port: 6379 }],
        {
          dnsLookup: expect.any(Function),
          keyPrefix: 'waste-obligations-frontend:',
          redisOptions: { db: 0, password: 'pass', tls: {}, username: 'user' },
          slotsRefreshTimeout: 10000
        }
      )
    })

    test('dnsLookup passes through cluster node address', () => {
      const dnsLookup = Cluster.mock.calls[0][1].dnsLookup
      const callback = vi.fn()

      dnsLookup('10.0.0.1', callback)

      expect(callback).toHaveBeenCalledWith(null, '10.0.0.1')
    })
  })
})
