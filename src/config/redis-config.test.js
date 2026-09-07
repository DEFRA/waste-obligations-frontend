import convict from 'convict'

import {
  createRedisConfig,
  DEFAULT_REDIS_CACHE_TTL_MS,
  POSITIVE_INTEGER_FORMAT,
  registerRedisConfigFormats
} from './redis-config.js'

beforeAll(() => {
  registerRedisConfigFormats(convict)
})

describe('Redis configuration', () => {
  test('uses single-instance Redis without TLS outside production', () => {
    const redisConfig = createRedisConfig(false)

    expect(redisConfig.useSingleInstanceCache.default).toBe(true)
    expect(redisConfig.useTLS.default).toBe(false)
  })

  test('uses Redis Cluster with TLS in production', () => {
    const redisConfig = createRedisConfig(true)

    expect(redisConfig.useSingleInstanceCache.default).toBe(false)
    expect(redisConfig.useTLS.default).toBe(true)
  })

  test('defaults Redis cache TTL to 4 hours', () => {
    const redisConfig = createRedisConfig(false)

    expect(redisConfig.cacheTtlMs.default).toBe(DEFAULT_REDIS_CACHE_TTL_MS)
    expect(redisConfig.cacheTtlMs.env).toBe('REDIS_CACHE_TTL_MS')
    expect(DEFAULT_REDIS_CACHE_TTL_MS).toBe(14400000)
  })

  test('coerces a positive Redis timeout from the environment', () => {
    const timeoutConfig = convict(
      {
        commandTimeoutMs: {
          doc: 'Redis command timeout',
          format: POSITIVE_INTEGER_FORMAT,
          default: 5000,
          env: 'REDIS_COMMAND_TIMEOUT_MS'
        }
      },
      { env: { REDIS_COMMAND_TIMEOUT_MS: '2500' } }
    )

    timeoutConfig.validate({ allowed: 'strict' })

    expect(timeoutConfig.get('commandTimeoutMs')).toBe(2500)
  })

  test('coerces Redis cache TTL from the environment', () => {
    const ttlConfig = convict(
      {
        cacheTtlMs: {
          doc: 'Redis cache TTL',
          format: POSITIVE_INTEGER_FORMAT,
          default: DEFAULT_REDIS_CACHE_TTL_MS,
          env: 'REDIS_CACHE_TTL_MS'
        }
      },
      { env: { REDIS_CACHE_TTL_MS: '7200000' } }
    )

    ttlConfig.validate({ allowed: 'strict' })

    expect(ttlConfig.get('cacheTtlMs')).toBe(7200000)
  })
})
