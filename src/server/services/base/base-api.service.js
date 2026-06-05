import Joi from 'joi'

import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { getServiceOAuthAccessToken } from '#/server/services/base/oauth-token.js'
import { buildTracingHeader } from '#/server/services/base/tracing-headers.js'
import { ApiError } from './api-error.js'

const DEFAULT_CACHE_TTL_MS = 300000
const DEFAULT_ACCEPT_HEADER = 'application/json'
const AUTH_MODE_BASIC = 'basic'
const AUTH_MODE_BEARER = 'bearer'
const AUTH_MODE_NONE = 'none'
const MIN_CACHE_TTL_MS = 1000

const baseApiOptionsSchema = Joi.object({
  serviceName: Joi.string().default('base-api'),
  baseUrl: Joi.string().trim().required(),
  fetchImpl: Joi.function().default(() => fetch),
  logger: Joi.object().default(() => createLogger()),
  headers: Joi.object().unknown(true).optional(),
  tracingHeader: Joi.string().default('x-cdp-request-id'),
  cacheTtlMs: Joi.number()
    .integer()
    .min(MIN_CACHE_TTL_MS)
    .default(DEFAULT_CACHE_TTL_MS),
  authMode: Joi.string()
    .valid(AUTH_MODE_BASIC, AUTH_MODE_BEARER, AUTH_MODE_NONE)
    .default(AUTH_MODE_BASIC),
  clientId: Joi.when('authMode', {
    is: Joi.valid(AUTH_MODE_BASIC, AUTH_MODE_BEARER),
    then: Joi.string().trim().required(),
    otherwise: Joi.string().allow('').optional()
  }),
  clientSecret: Joi.when('authMode', {
    is: Joi.valid(AUTH_MODE_BASIC, AUTH_MODE_BEARER),
    then: Joi.string().trim().required(),
    otherwise: Joi.string().allow('').optional()
  }),
  scope: Joi.when('authMode', {
    is: AUTH_MODE_BEARER,
    then: Joi.string().trim().required(),
    otherwise: Joi.string().allow('').optional()
  }),
  tokenEndpoint: Joi.when('authMode', {
    is: AUTH_MODE_BEARER,
    then: Joi.string().trim().required(),
    otherwise: Joi.string().allow('').optional()
  }),
  cacheClient: Joi.when('authMode', {
    is: AUTH_MODE_BEARER,
    then: Joi.object().required(),
    otherwise: Joi.object().allow(null).optional()
  })
})

function trimTrailingSlash(value) {
  const text = String(value)
  let endIndex = text.length - 1

  while (endIndex >= 0 && text[endIndex] === '/') {
    endIndex -= 1
  }

  return text.slice(0, endIndex + 1)
}

function buildDefaultHeaders(headers) {
  return headers
    ? { ...headers, Accept: DEFAULT_ACCEPT_HEADER }
    : { Accept: DEFAULT_ACCEPT_HEADER }
}

function validateBaseApiOptions(options) {
  const { error, value } = baseApiOptionsSchema.validate(options, {
    abortEarly: false
  })

  if (error) {
    throw new Error(
      `Base API service options are not valid (${error.details.map((detail) => detail.message).join('; ')})`
    )
  }

  return {
    serviceName: value.serviceName,
    options: {
      baseUrl: trimTrailingSlash(value.baseUrl),
      fetchImpl: value.fetchImpl,
      logger: value.logger,
      headers: buildDefaultHeaders(value.headers),
      tracingHeader: value.tracingHeader,
      clientId: value.clientId ?? '',
      clientSecret: value.clientSecret ?? '',
      scope: value.scope ?? '',
      tokenEndpoint: value.tokenEndpoint ?? '',
      authMode: value.authMode,
      cacheTtlMs: value.cacheTtlMs,
      cacheClient: value.cacheClient ?? null
    }
  }
}

export class BaseApiService {
  constructor(options) {
    const validated = validateBaseApiOptions(options)

    this.serviceName = validated.serviceName
    this.options = validated.options
  }

  buildCacheKey(...parts) {
    return [this.serviceName, ...parts].join(':')
  }

  buildUrl(path) {
    return `${this.options.baseUrl}${path}`
  }

  async getHeaders(extraHeaders = {}) {
    const traceId = extraHeaders[this.options.tracingHeader] ?? null

    return {
      ...this.options.headers,
      ...(await this.#getAuthHeader(traceId)),
      ...extraHeaders
    }
  }

  getBasicAuthHeader() {
    const basicToken = Buffer.from(
      `${this.options.clientId}:${this.options.clientSecret}`
    ).toString('base64')

    return {
      Authorization: `Basic ${basicToken}`
    }
  }

  getTracingHeader(headerValue) {
    return buildTracingHeader(this.options.tracingHeader, headerValue)
  }

  async getJson(path, headers, cacheKey) {
    const cachedData = cacheKey ? await this.getCachedJson(cacheKey) : null

    if (cachedData) {
      return cachedData
    }

    const response = await this.#fetchResponse('GET', path, {
      headers: await this.getHeaders(headers)
    })

    const data = await response.json()

    if (cacheKey) {
      await this.setCachedJson(cacheKey, data)
    }

    return data
  }

  async postJson(path, body, headers) {
    const response = await this.#fetchResponse('POST', path, {
      headers: {
        ...(await this.getHeaders(headers)),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body ?? {})
    })

    return this.#readJsonBodyIfPresent(response)
  }

  async putJson(path, body, headers) {
    const response = await this.#fetchResponse('PUT', path, {
      headers: {
        ...(await this.getHeaders(headers)),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body ?? {})
    })

    return this.#readJsonBodyIfPresent(response)
  }

  async deleteJson(path, headers) {
    const response = await this.#fetchResponse('DELETE', path, {
      headers: await this.getHeaders(headers)
    })

    return this.#readJsonBodyIfPresent(response)
  }

  async #fetchResponse(method, path, init) {
    const response = await this.options.fetchImpl(this.buildUrl(path), {
      method,
      ...init
    })

    if (!response.ok) {
      const errorBody = await this.#parseProblemJsonBody(response)

      throw ApiError.from({
        message: `${this.serviceName} API request failed with status ${response.status}`,
        status: response.status,
        body: errorBody
      })
    }

    return response
  }

  async #readJsonBodyIfPresent(response) {
    const contentType = this.#getResponseContentType(response)
    const hasJsonBody =
      typeof response.json === 'function' &&
      (contentType.includes('application/json') ||
        contentType.includes('application/problem+json'))

    if (!hasJsonBody) {
      return null
    }

    return response.json()
  }

  async getCachedJson(cacheKey) {
    if (!this.options.cacheClient) {
      return null
    }

    try {
      const value = await this.options.cacheClient.get(cacheKey)
      if (!value) {
        return null
      }

      return JSON.parse(value)
    } catch (error) {
      this.options.logger.warn(
        { err: error, cacheKey },
        'Unable to read cache entry'
      )
      return null
    }
  }

  async setCachedJson(cacheKey, value) {
    if (!this.options.cacheClient) {
      return
    }

    try {
      await this.options.cacheClient.set(
        cacheKey,
        JSON.stringify(value),
        'PX',
        this.options.cacheTtlMs
      )
    } catch (error) {
      this.options.logger.warn(
        { err: error, cacheKey },
        'Unable to set cache entry'
      )
    }
  }

  #getResponseContentType(response) {
    if (typeof response?.headers?.get === 'function') {
      return String(response.headers.get('content-type') ?? '').toLowerCase()
    }

    return ''
  }

  #accessTokenOptions(traceId) {
    return {
      cacheClient: this.options.cacheClient,
      cacheTtlMs: this.options.cacheTtlMs,
      clientId: this.options.clientId,
      clientSecret: this.options.clientSecret,
      scope: this.options.scope,
      tokenEndpoint: this.options.tokenEndpoint,
      logger: this.options.logger,
      fetchImpl: this.options.fetchImpl,
      tracingHeader: this.options.tracingHeader,
      traceId
    }
  }

  async #getAuthHeader(traceId) {
    if (this.options.authMode === AUTH_MODE_BASIC) {
      return this.getBasicAuthHeader()
    }

    if (this.options.authMode === AUTH_MODE_BEARER) {
      if (!traceId) {
        throw new Error('traceId is required when using bearer auth')
      }

      const accessToken = await getServiceOAuthAccessToken(
        this.#accessTokenOptions(traceId)
      )

      return {
        Authorization: `Bearer ${accessToken}`
      }
    }

    return {}
  }

  async #parseProblemJsonBody(response) {
    const contentType = this.#getResponseContentType(response)
    const isProblemJson = contentType.includes('application/problem+json')

    if (!isProblemJson || typeof response.json !== 'function') {
      return null
    }

    try {
      return await response.json()
    } catch {
      return null
    }
  }
}
