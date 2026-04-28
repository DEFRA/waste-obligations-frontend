import { config } from '#/config/config.js'
import { buildRedisClient } from '#/server/common/helpers/redis-client.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'

function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, '')
}

export class ApiRequestError extends Error {
  constructor({
    status,
    type = null,
    title = null,
    detail = null,
    instance = null,
    traceId = null,
    errors = null,
    message = null
  }) {
    super(
      message ?? detail ?? title ?? `API request failed with status ${status}`
    )
    this.name = 'ApiRequestError'
    this.status = status
    this.type = type
    this.title = title
    this.detail = detail
    this.instance = instance
    this.traceId = traceId
    this.errors = errors
  }
}

export class BaseApiService {
  constructor(options = {}) {
    this.serviceName = options.serviceName ?? 'base-api'
    this.baseUrl = trimTrailingSlash(options.baseUrl ?? '')
    this.fetchImpl = options.fetchImpl ?? fetch
    this.cacheTtlMs = options.cacheTtlMs ?? 300000
    this.cacheClient = options.cacheClient ?? null
    this.logger = options.logger ?? createLogger()
    this.headers = {
      ...(options.headers ?? {}),
      Accept: 'application/json'
    }
    this.tracingHeader = options.tracingHeader ?? 'x-cdp-request-id'
    this.clientId = options.clientId ?? ''
    this.clientSecret = options.clientSecret ?? ''
    this.authMode = options.authMode ?? 'basic'
  }

  buildCacheKey(...parts) {
    return [this.serviceName, ...parts].join(':')
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

  getTracingHeader(headerValue) {
    return !headerValue || !this.tracingHeader
      ? {}
      : {
          [this.tracingHeader]: headerValue
        }
  }

  async getJson(path, headers = {}) {
    const urlPath = this.buildUrl(path)
    const response = await this.fetchImpl(urlPath, {
      method: 'GET',
      headers: this.getHeaders(headers)
    })

    if (!response.ok) {
      const contentType = this.#getResponseContentType(response)
      let errorBody = null
      const isProblemJson = contentType.includes('application/problem+json')

      if (isProblemJson) {
        try {
          if (typeof response.json === 'function') {
            errorBody = await response.json()
          }
        } catch {
          errorBody = null
        }
      }

      throw this.#buildApiRequestError(response.status, errorBody)
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

  #getResponseContentType(response) {
    if (typeof response?.headers?.get === 'function') {
      return String(response.headers.get('content-type') ?? '').toLowerCase()
    }

    return ''
  }

  #buildApiRequestError(status, body) {
    return new ApiRequestError({
      status,
      message: `${this.serviceName} API request failed with status ${status}`,
      type: body?.type ?? null,
      title: body?.title ?? null,
      detail: body?.detail ?? null,
      instance: body?.instance ?? null,
      traceId: body?.traceId ?? null,
      errors: body?.errors ?? null
    })
  }
}
