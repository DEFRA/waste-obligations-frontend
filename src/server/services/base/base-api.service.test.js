import Joi from 'joi'
import { ProxyAgent } from 'undici'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { config } from '#/config/config.js'
import { BaseApiService } from './base-api.service.js'

const getTraceId = vi.hoisted(() => vi.fn(() => null))

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId,
  tracing: {
    plugin: {}
  },
  withTraceId: (headerName, headers = {}) => {
    const traceId = getTraceId()
    if (traceId) {
      headers[headerName] = traceId
    }
    return headers
  }
}))

function createServiceOptions(overrides = {}) {
  return {
    baseUrl: 'http://localhost',
    fetchImpl: vi.fn(),
    serviceName: 'test-api',
    authMode: 'none',
    ...overrides
  }
}

describe('BaseApiService', () => {
  afterEach(() => {
    config.set('httpProxy', null)
  })

  test('useProxy defaults to false', () => {
    const service = new BaseApiService(createServiceOptions())

    expect(service.options.useProxy).toBe(false)
  })

  test('getJson does not attach proxy dispatcher when useProxy is false', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true })
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, useProxy: false })
    )

    await service.getJson('/resource')

    expect(fetchImpl.mock.calls[0][1].dispatcher).toBeUndefined()
  })

  test('getJson attaches ProxyAgent dispatcher when useProxy is true', async () => {
    config.set('httpProxy', 'http://localhost:8080')

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true })
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, useProxy: true })
    )

    await service.getJson('/resource')

    expect(fetchImpl.mock.calls[0][1].dispatcher).toBeInstanceOf(ProxyAgent)
  })

  test('throws when service options are not valid', () => {
    expect(() => new BaseApiService({})).toThrow(/not valid/)
  })

  test('throws when bearer auth options are incomplete', () => {
    expect(
      () =>
        new BaseApiService({
          baseUrl: 'http://localhost',
          authMode: 'bearer',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          scope: 'api://resource/.default',
          tokenEndpoint: 'https://login.example/oauth2/v2.0/token'
        })
    ).toThrow(/not valid/)
  })

  test('buildCacheKey joins service name and parts', () => {
    const service = new BaseApiService(createServiceOptions())

    expect(service.buildCacheKey('organisation', 'org-1')).toBe(
      'test-api:organisation:org-1'
    )
  })

  test('buildUrl trims trailing slash from base URL', () => {
    const service = new BaseApiService(
      createServiceOptions({ baseUrl: 'http://localhost:9090/' })
    )

    expect(service.buildUrl('/organisations/org-1')).toBe(
      'http://localhost:9090/organisations/org-1'
    )
  })

  test('getJson adds trace header when request context provides trace id', async () => {
    getTraceId.mockReturnValue('trace-xyz')

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true })
    })
    const service = new BaseApiService(createServiceOptions({ fetchImpl }))

    await service.getJson('/resource')

    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost/resource',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-cdp-request-id': 'trace-xyz'
        })
      })
    )
  })

  test('getJson skips response cache when cacheResponses is false', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ live: true })
    })
    const cacheClient = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ from: 'cache' })),
      set: vi.fn()
    }
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, cacheClient, cacheResponses: false })
    )

    const data = await service.getJson('/resource', 'cache-key')

    expect(data).toEqual({ live: true })
    expect(cacheClient.get).not.toHaveBeenCalled()
    expect(cacheClient.set).not.toHaveBeenCalled()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('getJson returns cached payload without calling fetch', async () => {
    const fetchImpl = vi.fn()
    const cacheClient = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ from: 'cache' })),
      set: vi.fn()
    }
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, cacheClient, cacheResponses: true })
    )

    const data = await service.getJson('/resource', 'cache-key')

    expect(data).toEqual({ from: 'cache' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('getJson fetches, parses json, and writes cache when cache misses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ live: true })
    })
    const cacheClient = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined)
    }
    const service = new BaseApiService(
      createServiceOptions({
        fetchImpl,
        cacheClient,
        cacheResponses: true,
        authMode: 'basic',
        clientId: 'user',
        clientSecret: 'pass'
      })
    )

    const data = await service.getJson('/resource', 'cache-key')

    expect(data).toEqual({ live: true })
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost/resource',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: expect.stringMatching(/^Basic /)
        })
      })
    )
    expect(cacheClient.set).toHaveBeenCalled()
  })

  test('getJson validates response with schema', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: 'valid-id' })
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    const result = await service.getJson(
      '/resource',
      null,
      Joi.object({ id: Joi.string().required() })
    )

    expect(result).toEqual({ id: 'valid-id' })
  })

  test('getJson throws ApiResponseValidationError when response fails schema', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: 123 })
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(
      service.getJson(
        '/resource',
        null,
        Joi.object({ id: Joi.string().required() })
      )
    ).rejects.toMatchObject({
      name: 'ApiResponseValidationError',
      serviceName: 'upstream'
    })
  })

  test('getJson validates cached payload with schema', async () => {
    const fetchImpl = vi.fn()
    const cacheClient = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ id: 'cached-id' })),
      set: vi.fn()
    }
    const service = new BaseApiService(
      createServiceOptions({
        fetchImpl,
        cacheClient,
        cacheResponses: true,
        serviceName: 'test-api'
      })
    )

    const result = await service.getJson(
      '/resource',
      'cache-key',
      Joi.object({ id: Joi.string().required() })
    )

    expect(result).toEqual({ id: 'cached-id' })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('getJson throws ApiResponseValidationError when cached payload fails schema', async () => {
    const cacheClient = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ id: 123 })),
      set: vi.fn()
    }
    const service = new BaseApiService(
      createServiceOptions({
        fetchImpl: vi.fn(),
        cacheClient,
        cacheResponses: true,
        serviceName: 'test-api'
      })
    )

    await expect(
      service.getJson(
        '/resource',
        'cache-key',
        Joi.object({ id: Joi.string().required() })
      )
    ).rejects.toMatchObject({
      name: 'ApiResponseValidationError',
      serviceName: 'test-api'
    })
  })

  test('getJson throws ApiError when response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue({
        title: 'Bad Gateway',
        status: 502
      })
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(service.getJson('/fail', 'ck')).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      title: 'Bad Gateway'
    })
  })

  test('getJson throws ApiError when error response has no problem+json body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: {
        get: vi.fn().mockReturnValue('text/plain')
      }
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(service.getJson('/fail')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503
    })
  })

  test('postJson accepts a single Joi schema as response validator', async () => {
    const created = { id: '1' }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: {
        get: vi.fn().mockReturnValue('application/json')
      },
      json: vi.fn().mockResolvedValue(created)
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )
    const responseSchema = Joi.object({ id: Joi.string().required() })

    const result = await service.postJson('/create', {}, responseSchema)

    expect(result).toEqual(created)
  })

  test('postJson throws ApiResponseValidationError when response fails schema', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: {
        get: vi.fn().mockReturnValue('application/json')
      },
      json: vi.fn().mockResolvedValue({ id: 123 })
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(
      service.postJson(
        '/create',
        {},
        {
          response: Joi.object({ id: Joi.string().required() })
        }
      )
    ).rejects.toMatchObject({
      name: 'ApiResponseValidationError',
      serviceName: 'upstream'
    })
  })

  test('postJson throws before fetch when request schema fails', async () => {
    const fetchImpl = vi.fn()
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(
      service.postJson(
        '/create',
        { invalid: true },
        {
          request: Joi.object({ id: Joi.string().required() }),
          response: Joi.object({ id: Joi.string().required() })
        }
      )
    ).rejects.toMatchObject({
      name: 'ApiRequestValidationError',
      serviceName: 'upstream'
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('postJson returns parsed json when content-type is application/json', async () => {
    const created = { id: '1' }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      headers: {
        get: vi.fn().mockReturnValue('application/json; charset=utf-8')
      },
      json: vi.fn().mockResolvedValue(created)
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    const body = { a: 1 }
    const result = await service.postJson('/create', body)

    expect(result).toEqual(created)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost/create',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    )
  })

  test('postJson returns null when response has no content-type header', async () => {
    const json = vi.fn()
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(service.postJson('/noop', {})).resolves.toBeNull()
    expect(json).not.toHaveBeenCalled()
  })

  test('postJson returns null when response has no JSON content-type', async () => {
    const json = vi.fn()
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: {
        get: vi.fn().mockReturnValue('text/plain')
      },
      json
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(service.postJson('/noop', {})).resolves.toBeNull()
    expect(json).not.toHaveBeenCalled()
  })

  test('postJson serialises null body as empty object', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn().mockReturnValue('application/json')
      },
      json: vi.fn().mockResolvedValue({})
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await service.postJson('/x', null)

    expect(fetchImpl.mock.calls[0][1].body).toBe(JSON.stringify({}))
  })

  test('postJson throws ApiError when response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue({
        title: 'Conflict',
        status: 409
      })
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(service.postJson('/x', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      title: 'Conflict'
    })
  })

  test('postJson reads application/problem+json body on success', async () => {
    const problem = { type: 'about:blank', title: 'Accepted', status: 202 }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue(problem)
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(service.postJson('/x', {})).resolves.toEqual(problem)
  })

  test('putJson throws before fetch when request schema fails', async () => {
    const fetchImpl = vi.fn()
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(
      service.putJson(
        '/resource/1',
        { invalid: true },
        {
          request: Joi.object({ id: Joi.string().required() }),
          response: Joi.object({ id: Joi.string().required() })
        }
      )
    ).rejects.toMatchObject({
      name: 'ApiRequestValidationError',
      serviceName: 'upstream'
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('putJson sends PUT with JSON body', async () => {
    const updated = { id: '1', name: 'v2' }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn().mockReturnValue('application/json')
      },
      json: vi.fn().mockResolvedValue(updated)
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    const body = { name: 'v2' }
    const result = await service.putJson('/resource/1', body)

    expect(result).toEqual(updated)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost/resource/1',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(body),
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    )
  })

  test('putJson returns null when response has no JSON body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: {
        get: vi.fn().mockReturnValue('')
      },
      json: vi.fn()
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(
      service.putJson('/resource/1', { name: 'v2' })
    ).resolves.toBeNull()
  })

  test('putJson throws ApiResponseValidationError when response fails schema', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn().mockReturnValue('application/json')
      },
      json: vi.fn().mockResolvedValue({ id: 123 })
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(
      service.putJson(
        '/resource/1',
        { name: 'v2' },
        {
          response: Joi.object({ id: Joi.string().required() })
        }
      )
    ).rejects.toMatchObject({
      name: 'ApiResponseValidationError',
      serviceName: 'upstream'
    })
  })

  test('deleteJson validates JSON response when schema provided', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: vi.fn().mockReturnValue('application/json')
      },
      json: vi.fn().mockResolvedValue({ removed: true })
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    const result = await service.deleteJson(
      '/resource/1',
      Joi.object({ removed: Joi.boolean().required() })
    )

    expect(result).toEqual({ removed: true })
  })

  test('getCachedJson returns null when caching is disabled', async () => {
    const cacheClient = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ from: 'cache' })),
      set: vi.fn()
    }
    const service = new BaseApiService(
      createServiceOptions({
        fetchImpl: vi.fn(),
        cacheClient,
        cacheResponses: false
      })
    )

    await expect(service.getCachedJson('cache-key')).resolves.toBeNull()
    expect(cacheClient.get).not.toHaveBeenCalled()
  })

  test('getCachedJson returns null when cache client is not configured', async () => {
    const service = new BaseApiService(
      createServiceOptions({
        fetchImpl: vi.fn(),
        cacheResponses: true
      })
    )

    await expect(service.getCachedJson('cache-key')).resolves.toBeNull()
  })

  test('getCachedJson returns null when cache read fails', async () => {
    const logger = { warn: vi.fn() }
    const cacheClient = {
      get: vi.fn().mockRejectedValue(new Error('redis-read-failed')),
      set: vi.fn()
    }
    const service = new BaseApiService(
      createServiceOptions({
        fetchImpl: vi.fn(),
        cacheClient,
        cacheResponses: true,
        logger
      })
    )

    await expect(service.getCachedJson('cache-key')).resolves.toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      { err: expect.any(Error), cacheKey: 'cache-key' },
      'Unable to read cache entry'
    )
  })

  test('setCachedJson no-ops when caching is disabled', async () => {
    const cacheClient = {
      get: vi.fn(),
      set: vi.fn().mockResolvedValue(undefined)
    }
    const service = new BaseApiService(
      createServiceOptions({
        fetchImpl: vi.fn(),
        cacheClient,
        cacheResponses: false
      })
    )

    await service.setCachedJson('cache-key', { ok: true })

    expect(cacheClient.set).not.toHaveBeenCalled()
  })

  test('setCachedJson no-ops when cache client is not configured', async () => {
    const service = new BaseApiService(
      createServiceOptions({
        fetchImpl: vi.fn(),
        cacheResponses: true
      })
    )

    await expect(
      service.setCachedJson('cache-key', { ok: true })
    ).resolves.toBeUndefined()
  })

  test('setCachedJson logs when cache write fails', async () => {
    const logger = { warn: vi.fn() }
    const cacheClient = {
      get: vi.fn(),
      set: vi.fn().mockRejectedValue(new Error('redis-write-failed'))
    }
    const service = new BaseApiService(
      createServiceOptions({
        fetchImpl: vi.fn(),
        cacheClient,
        cacheResponses: true,
        logger
      })
    )

    await service.setCachedJson('cache-key', { ok: true })

    expect(logger.warn).toHaveBeenCalledWith(
      { err: expect.any(Error), cacheKey: 'cache-key' },
      'Unable to set cache entry'
    )
  })

  test('getJson adds bearer auth and trace header when auth mode is bearer', async () => {
    getTraceId.mockReturnValue('trace-abc')

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          access_token: 'service-token',
          expires_in: 3600
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ ok: true })
      })
    const logger = { warn: vi.fn() }
    const cacheClient = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined)
    }
    const service = new BaseApiService(
      createServiceOptions({
        fetchImpl,
        authMode: 'bearer',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        tokenEndpoint: 'https://login.example/oauth2/v2.0/token',
        scope: 'api://resource/.default',
        cacheClient,
        cacheTtlMs: 300000,
        logger,
        tracingHeader: 'x-cdp-request-id'
      })
    )

    await service.getJson('/resource')

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://login.example/oauth2/v2.0/token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-cdp-request-id': 'trace-abc'
        })
      })
    )
    expect(fetchImpl.mock.calls[1][1].headers.Authorization).toBe(
      'Bearer service-token'
    )
  })

  test('omits auth header when auth mode is not basic', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ ok: true })
    })
    const service = new BaseApiService(createServiceOptions({ fetchImpl }))

    await service.getJson('/resource')

    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  test('postJson returns null when problem+json body cannot be parsed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockRejectedValue(new Error('invalid json'))
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(service.postJson('/x', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 400
    })
  })

  test('deleteJson returns null for 204 with no JSON body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: {
        get: vi.fn().mockReturnValue('')
      },
      json: vi.fn()
    })
    const service = new BaseApiService(
      createServiceOptions({ fetchImpl, serviceName: 'upstream' })
    )

    await expect(service.deleteJson('/resource/1')).resolves.toBeNull()
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost/resource/1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
