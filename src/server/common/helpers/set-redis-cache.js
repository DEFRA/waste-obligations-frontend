import { config } from '#/config/config.js'

export function setRedisCache(cacheClient, key, value, ttlMs) {
  return cacheClient.set(
    key,
    value,
    'PX',
    ttlMs ?? config.get('redis.cacheTtlMs')
  )
}
