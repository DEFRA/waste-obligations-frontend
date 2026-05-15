import { config } from '#/config/config.js'
import { buildRedisClient } from '#/server/common/helpers/redis-client.js'

/**
 * Registers Redis client on `server.app`.
 */
export const redisServices = {
  name: 'redis-services',
  version: '1.0.0',
  register(server) {
    const redisClient = buildRedisClient(config.get('redis'))

    server.app.redisClient = redisClient
    server.events.on('stop', () => {
      const redis = server.app.redisClient
      if (redis?.quit) {
        redis.quit().catch(() => {})
      }
    })
  }
}
