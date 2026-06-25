import { RedisCacheValidationError } from '#/server/common/helpers/validate-redis-cache.js'

export function createSubmitCachePreHandler({
  buildCacheKey,
  readCacheRaw,
  entityIdParam
}) {
  return {
    assign: 'cachedPayload',
    method: async (request) => {
      const entityId = request.params[entityIdParam]
      const { year } = request.query
      const cacheKey = buildCacheKey(request.yar.get('user').id, entityId, year)

      try {
        return await readCacheRaw(request.server.app.redisClient, cacheKey)
      } catch (error) {
        const message =
          error instanceof RedisCacheValidationError
            ? 'Submit cache payload failed validation'
            : `Failed to parse submit cache payload for ${year} year`

        request.logger.error(
          { err: error },
          `${message}: ${entityIdParam}=${entityId}, year=${year}`
        )
      }

      return null
    }
  }
}
