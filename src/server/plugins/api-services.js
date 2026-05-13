import { config } from '#/config/config.js'
import { buildRedisClient } from '#/server/common/helpers/redis-client.js'
import { createWasteOrganisationsApiService } from '#/server/services/waste-organisations-api.service.js'
import { createWasteObligationsApiService } from '#/server/services/waste-obligations-api.service.js'

/**
 * Registers shared Waste Organisations / Waste Obligations HTTP clients on `server.app`.
 * GET responses are cached in Redis (`redis` config, `apiHttpCache.ttl`).
 */
export const apiServices = {
  name: 'api-services',
  version: '1.0.0',
  register(server) {
    const cacheTtlMs = config.get('apiHttpCache.ttl')
    const cacheClient = buildRedisClient(config.get('redis'))
    const cacheOptions = { cacheClient, cacheTtlMs }

    server.app.apiHttpCacheRedis = cacheClient
    server.events.on('stop', () => {
      const redis = server.app.apiHttpCacheRedis
      if (redis?.quit) {
        redis.quit().catch(() => {})
      }
    })

    server.app.wasteOrganisationsApi =
      createWasteOrganisationsApiService(cacheOptions)
    server.app.wasteObligationsApi =
      createWasteObligationsApiService(cacheOptions)
  }
}
