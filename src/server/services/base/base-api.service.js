import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { ApiError } from './api-error.js'

function trimTrailingSlash(value) {
  return String(value).replace(/\/+$/, '')
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

  async getJson(path, headers, cacheKey) {
    const cachedData = await this.getCachedJson(cacheKey)

    if (cachedData) {
      return cachedData
    }

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

      throw ApiError.from({
        message: `${this.serviceName} API request failed with status ${response.status}`,
        status: response.status,
        body: errorBody
      })
    }

    const data = await response.json()

    await this.setCachedJson(cacheKey, data)

    return data
  }

  async getCachedJson(cacheKey) {
    if (!this.cacheClient) {
      return null
    }

    try {
      const value = await this.cacheClient.get(cacheKey)
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
    if (!this.cacheClient) {
      return
    }

    try {
      await this.cacheClient.set(
        cacheKey,
        JSON.stringify(value),
        'PX',
        this.cacheTtlMs
      )
    } catch (error) {
      this.logger.warn({ err: error, cacheKey }, 'Unable to set cache entry')
    }
  }

  #getResponseContentType(response) {
    if (typeof response?.headers?.get === 'function') {
      return String(response.headers.get('content-type') ?? '').toLowerCase()
    }

    return ''
  }
}
