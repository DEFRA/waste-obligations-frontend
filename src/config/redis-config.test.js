import convict from 'convict'

import {
  createRedisConfig,
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
})
