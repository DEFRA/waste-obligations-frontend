export const POSITIVE_INTEGER_FORMAT = 'positive-integer'

/** Default Redis key expiry: 4 hours */
export const DEFAULT_REDIS_CACHE_TTL_MS = 14400000

export function registerRedisConfigFormats(convict) {
  convict.addFormat({
    name: POSITIVE_INTEGER_FORMAT,
    validate(value) {
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error('must be a positive integer')
      }
    },
    coerce: Number
  })
}

export function createRedisConfig(isProduction) {
  return {
    host: {
      doc: 'Redis cache host',
      format: String,
      default: '127.0.0.1',
      env: 'REDIS_HOST'
    },
    username: {
      doc: 'Redis cache username',
      format: String,
      default: '',
      env: 'REDIS_USERNAME'
    },
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: '',
      sensitive: true,
      env: 'REDIS_PASSWORD'
    },
    keyPrefix: {
      doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
      format: String,
      default: 'waste-obligations-frontend:',
      env: 'REDIS_KEY_PREFIX'
    },
    useSingleInstanceCache: {
      doc: 'Connect to a single instance of redis instead of a cluster.',
      format: Boolean,
      default: !isProduction,
      env: 'USE_SINGLE_INSTANCE_CACHE'
    },
    useTLS: {
      doc: 'Connect to redis using TLS',
      format: Boolean,
      default: isProduction,
      env: 'REDIS_TLS'
    },
    cacheTtlMs: {
      doc: 'Expiry time in milliseconds for Redis cache keys written by the application',
      format: POSITIVE_INTEGER_FORMAT,
      default: DEFAULT_REDIS_CACHE_TTL_MS,
      env: 'REDIS_CACHE_TTL_MS'
    },
    connectTimeoutMs: {
      doc: 'Maximum time in milliseconds to establish a Redis connection',
      format: POSITIVE_INTEGER_FORMAT,
      default: 10000,
      env: 'REDIS_CONNECT_TIMEOUT_MS'
    },
    commandTimeoutMs: {
      doc: 'Maximum time in milliseconds to wait for a Redis command response',
      format: POSITIVE_INTEGER_FORMAT,
      default: 5000,
      env: 'REDIS_COMMAND_TIMEOUT_MS'
    },
    clusterSlotsRefreshTimeoutMs: {
      doc: 'Maximum time in milliseconds to refresh Redis cluster slot information',
      format: POSITIVE_INTEGER_FORMAT,
      default: 10000,
      env: 'REDIS_CLUSTER_SLOTS_REFRESH_TIMEOUT_MS'
    }
  }
}
