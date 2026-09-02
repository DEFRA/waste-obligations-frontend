import { describe, expect, test, vi } from 'vitest'

import { RedisCacheValidationError } from '#/server/common/helpers/validate-redis-cache.js'

import { createSubmitCachePreHandler } from './cache-pre-handler.js'

const userId = 'e72be574-8b5b-4836-af47-dd7e0c0d1d87'
const entityId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

function buildRequest(overrides = {}) {
  return {
    params: { organisationId: entityId, ...overrides.params },
    query: { year: 2026, ...overrides.query },
    yar: {
      get(key) {
        if (key === 'user') {
          return { id: userId }
        }

        return undefined
      }
    },
    server: {
      app: {
        redisClient: overrides.redisClient ?? { get: vi.fn() }
      }
    },
    logger: { error: vi.fn() },
    ...overrides
  }
}

describe('createSubmitCachePreHandler', () => {
  test('reads cached payload using the configured cache key', async () => {
    const cachedPayload = { obligationYear: 2026 }
    const readCacheRaw = vi.fn().mockResolvedValue(cachedPayload)
    const buildCacheKey = vi.fn().mockReturnValue('cache-key')
    const preHandler = createSubmitCachePreHandler({
      buildCacheKey,
      readCacheRaw,
      entityIdParam: 'organisationId'
    })

    const result = await preHandler.method(buildRequest())

    expect(buildCacheKey).toHaveBeenCalledWith(userId, entityId, 2026)
    expect(readCacheRaw).toHaveBeenCalledWith(expect.any(Object), 'cache-key')
    expect(result).toEqual(cachedPayload)
  })

  test('returns null and logs when cache validation fails', async () => {
    const readCacheRaw = vi
      .fn()
      .mockRejectedValue(
        new RedisCacheValidationError('certificate-submit', [])
      )
    const preHandler = createSubmitCachePreHandler({
      buildCacheKey: () => 'cache-key',
      readCacheRaw,
      entityIdParam: 'organisationId'
    })
    const request = buildRequest()

    await expect(preHandler.method(request)).resolves.toBeNull()
    expect(request.logger.error).toHaveBeenCalledWith(
      { err: expect.any(RedisCacheValidationError) },
      `Submit cache payload failed validation: organisationId=${entityId}, year=2026`
    )
  })

  test('returns null and logs when cache JSON cannot be parsed', async () => {
    const readCacheRaw = vi
      .fn()
      .mockRejectedValue(new SyntaxError('Unexpected'))
    const preHandler = createSubmitCachePreHandler({
      buildCacheKey: () => 'cache-key',
      readCacheRaw,
      entityIdParam: 'schemeId'
    })
    const request = buildRequest({
      params: { schemeId: entityId }
    })

    await expect(preHandler.method(request)).resolves.toBeNull()
    expect(request.logger.error).toHaveBeenCalledWith(
      { err: expect.any(SyntaxError) },
      `Failed to parse submit cache payload for 2026 year: schemeId=${entityId}, year=2026`
    )
  })
})
