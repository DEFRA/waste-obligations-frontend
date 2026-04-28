import { config } from '#/config/config.js'
import { buildRedisClient } from '#/server/common/helpers/redis-client.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'

function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, '')
}

export class BaseApiService {
  constructor(options = {}) {
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? '')
    this.fetchImpl = options.fetchImpl ?? fetch
    this.cacheTtlMs = options.cacheTtlMs ?? 300000
    this.cacheClient = options.cacheClient ?? null
    this.logger = options.logger ?? createLogger()
    this.headers = {
      ...(options.headers ?? {}),
      Accept: 'application/json'
    }
    this.clientId = options.clientId ?? ''
    this.clientSecret = options.clientSecret ?? ''
    this.authMode = options.authMode ?? 'basic'
  }

  buildCacheKey(...parts) {
    return parts.join(':')
  }

  buildUrl(path) {
    return `${this.baseUrl}${path}`
  }

  getHeaders(extraHeaders = {}) {
    return {
      ...this.headers,
      // TODO: Add bearer token support
      ...(this.authMode === 'basic' ? this.getBasicAuthHeader() : {}),
      ...extraHeaders
    }
  }

  getBasicAuthHeader() {
    const basicToken = Buffer.from(
      `${this.clientId}:${this.clientSecret}`
    ).toString('base64')

    return {
      Authorization: `Basic ${basicToken}`
    }
  }

  async getJson(path, headers = {}) {
    const response = await this.fetchImpl(this.buildUrl(path), {
      method: 'GET',
      headers: this.getHeaders(headers)
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    return response.json()
  }

  async getCachedJson(cacheKey) {
    const cacheClient = this.getCacheClient()
    if (!cacheClient) {
      return null
    }

    try {
      const value = await cacheClient.get(cacheKey)
      if (!value) {
        return null
      }

      return JSON.parse(value)
    } catch (error) {
      this.logger.warn({ err: error, cacheKey }, 'Unable to read cache entry')
      return null
    }
  }

  async setCachedJson(cacheKey, value) {
    const cacheClient = this.getCacheClient()
    if (!cacheClient) {
      return
    }

    try {
      await cacheClient.set(
        cacheKey,
        JSON.stringify(value),
        'PX',
        this.cacheTtlMs
      )
    } catch (error) {
      this.logger.warn({ err: error, cacheKey }, 'Unable to set cache entry')
    }
  }

  getCacheClient() {
    if (this.cacheClient) {
      return this.cacheClient
    }

    try {
      this.cacheClient = buildRedisClient(config.get('redis'))
      return this.cacheClient
    } catch (error) {
      this.logger.warn(
        { err: error },
        'Unable to initialise Redis cache client'
      )
      return null
    }
  }
}
