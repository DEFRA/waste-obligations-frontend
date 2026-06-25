import {
  RedisCacheValidationError,
  validateRedisCache
} from '#/server/common/helpers/validate-redis-cache.js'

export function buildSubmitCacheKey(type, userId, entityId, year) {
  return `compliance-${type}-submit:${userId}:${entityId}:${year}`
}

export function createSubmitCacheOperations({ label, schema }) {
  function validatePayload(data) {
    return validateRedisCache(schema, data, label)
  }

  function parseRaw(raw) {
    if (raw == null || raw === '') {
      return null
    }

    try {
      return JSON.parse(raw)
    } catch {
      throw new RedisCacheValidationError(label, ['Invalid JSON payload'])
    }
  }

  async function write(cacheClient, cacheKey, payload) {
    const validated = validatePayload(payload)
    await cacheClient.set(cacheKey, JSON.stringify(validated))
  }

  async function readRaw(cacheClient, cacheKey) {
    const raw = await cacheClient.get(cacheKey)
    const parsed = parseRaw(raw)

    if (parsed == null) {
      return null
    }

    return validatePayload(parsed)
  }

  return { write, readRaw }
}
