import { describe, expect, test, vi } from 'vitest'

import { config } from '#/config/config.js'

import { setRedisCache } from './set-redis-cache.js'

describe('setRedisCache', () => {
  test('sets the value with the configured default TTL', async () => {
    const cacheClient = { set: vi.fn().mockResolvedValue('OK') }

    await expect(
      setRedisCache(cacheClient, 'cache-key', 'cache-value')
    ).resolves.toBe('OK')

    expect(cacheClient.set).toHaveBeenCalledWith(
      'cache-key',
      'cache-value',
      'PX',
      config.get('redis.cacheTtlMs')
    )
  })

  test('allows an explicit TTL override', async () => {
    const cacheClient = { set: vi.fn().mockResolvedValue('OK') }

    await setRedisCache(cacheClient, 'cache-key', 'cache-value', 60_000)

    expect(cacheClient.set).toHaveBeenCalledWith(
      'cache-key',
      'cache-value',
      'PX',
      60_000
    )
  })
})
