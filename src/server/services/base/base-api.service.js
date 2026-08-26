import Joi from 'joi'
import { withTraceId } from '@defra/hapi-tracing'

import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import {
  getLoadTestRequestHeaders,
  OUTBOUND_LOAD_TEST_SESSION_HEADER
} from '#/server/common/helpers/load-test/request-context.js'
import { getServiceOAuthAccessToken } from '#/server/services/base/oauth-token.js'
import { validateApiRequest } from '#/server/services/schemas/validate-api-request.js'
import { validateApiResponse } from '#/server/services/schemas/validate-api-response.js'
import { ApiError } from './api-error.js'
import {
  DEFAULT_REQUEST_RESILIENCE,
  fetchWithResilience
} from './request-resilience.js'

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
  cacheResponses: Joi.boolean().default(false),
  resilience: Joi.object({
    totalTimeoutMs: Joi.number()
      .integer()
      .positive()
      .default(DEFAULT_REQUEST_RESILIENCE.totalTimeoutMs),
    attemptTimeoutMs: Joi.number()
      .integer()
      .positive()
      .default(DEFAULT_REQUEST_RESILIENCE.attemptTimeoutMs),
    maxRetryAttempts: Joi.number()
      .integer()
      .min(0)
      .default(DEFAULT_REQUEST_RESILIENCE.maxRetryAttempts),
    retryDelayMs: Joi.number()
      .integer()
      .min(0)
      .default(DEFAULT_REQUEST_RESILIENCE.retryDelayMs)
  }).default(DEFAULT_REQUEST_RESILIENCE),
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
      cacheResponses: value.cacheResponses,
      cacheClient: value.cacheClient ?? null,
      resilience: value.resilience
    }
  }
}

function normalizeApiSchemas(schemas) {
  if (schemas == null) {
    return { request: null, response: null }
  }

  if (typeof schemas.validate === 'function') {
    return { request: null, response: schemas }
  }

  return {
    request: schemas.request ?? null,
    response: schemas.response ?? null
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

  async getHeaders({ signal } = {}) {
    return {
      ...withTraceId(this.options.tracingHeader, { ...this.options.headers }),
      ...getLoadTestRequestHeaders(),
      ...(await this.#getAuthHeader(signal))
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

  async getJson(path, cacheKey, schema) {
    // Load-test session keys deliberately produce a distinct upstream identity.
    // Do not serve a response for one virtual user from a shared API cache.
    const shouldCache =
      this.options.cacheResponses && cacheKey && !getLoadTestRequestHeaders()
    const cachedData = shouldCache ? await this.getCachedJson(cacheKey) : null

    if (cachedData) {
      return this.#validateResponse(cachedData, schema)
    }

    const response = await this.#fetchResponse('GET', path, {
      headers: await this.getHeaders()
    })

    const data = this.#validateResponse(await response.json(), schema)

    if (shouldCache) {
      await this.setCachedJson(cacheKey, data)
    }

    return data
  }

  async postJson(path, body, schemas) {
    const { request: requestSchema, response: responseSchema } =
      normalizeApiSchemas(schemas)
    const requestBody = this.#validateRequest(body, requestSchema)

    const response = await this.#fetchResponse('POST', path, {
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody ?? {})
    })

    const data = await this.#readJsonBodyIfPresent(response)

    if (data == null) {
      return null
    }

    return this.#validateResponse(data, responseSchema)
  }

  async putJson(path, body, schemas) {
    const { request: requestSchema, response: responseSchema } =
      normalizeApiSchemas(schemas)
    const requestBody = this.#validateRequest(body, requestSchema)

    const response = await this.#fetchResponse('PUT', path, {
      headers: {
        ...(await this.getHeaders()),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody ?? {})
    })

    const data = await this.#readJsonBodyIfPresent(response)

    if (data == null) {
      return null
    }

    return this.#validateResponse(data, responseSchema)
  }

  async deleteJson(path, schema) {
    const response = await this.#fetchResponse('DELETE', path, {
      headers: await this.getHeaders()
    })

    const data = await this.#readJsonBodyIfPresent(response)

    if (data == null) {
      return null
    }

    return this.#validateResponse(data, schema)
  }

  async #fetchResponse(method, path, init) {
    const loadTestSessionKey = init.headers?.[OUTBOUND_LOAD_TEST_SESSION_HEADER]

    if (loadTestSessionKey) {
      this.options.logger.info(
        `Forwarding load-test session header to ${this.serviceName}: session=${loadTestSessionKey}, method=${method}, path=${path}`
      )
    }

    const response = await fetchWithResilience({
      fetchImpl: this.options.fetchImpl,
      url: this.buildUrl(path),
      init: { method, ...init },
      // Retrying a mutation after a timeout can duplicate its side effect.
      retry: method === 'GET',
      resilience: this.options.resilience
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
    if (!this.options.cacheResponses || !this.options.cacheClient) {
      return null
    }

    try {
      const value = await this.options.cacheClient.get(cacheKey)
      if (!value) {
        return null
      }

      return JSON.parse(value)
    } catch (error) {
      logApplicationError(
        this.options.logger,
        'warn',
        error,
        `Unable to read cache entry (${cacheKey})`
      )
      return null
    }
  }

  async setCachedJson(cacheKey, value) {
    if (!this.options.cacheResponses || !this.options.cacheClient) {
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
      logApplicationError(
        this.options.logger,
        'warn',
        error,
        `Unable to set cache entry: cacheKey=${cacheKey}`
      )
    }
  }

  #getResponseContentType(response) {
    if (typeof response?.headers?.get === 'function') {
      return String(response.headers.get('content-type') ?? '').toLowerCase()
    }

    return ''
  }

  #accessTokenOptions(signal) {
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
      resilience: this.options.resilience,
      signal
    }
  }

  async #getAuthHeader(signal) {
    if (this.options.authMode === AUTH_MODE_BASIC) {
      return this.getBasicAuthHeader()
    }

    if (this.options.authMode === AUTH_MODE_BEARER) {
      const accessToken = await getServiceOAuthAccessToken(
        this.#accessTokenOptions(signal)
      )

      return {
        Authorization: `Bearer ${accessToken}`
      }
    }

    return {}
  }

  #validateRequest(data, schema) {
    if (!schema) {
      return data
    }

    return validateApiRequest(schema, data, this.serviceName)
  }

  #validateResponse(data, schema) {
    if (!schema) {
      return data
    }

    return validateApiResponse(schema, data, this.serviceName)
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
