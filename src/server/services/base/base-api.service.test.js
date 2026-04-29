import { describe, expect, test, vi } from 'vitest'

import { ApiError } from './api-error.js'
import { BaseApiService } from './base-api.service.js'

function mockLogger() {
  return {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  }
}

describe('BaseApiService', () => {
  test('buildUrl trims trailing slash from baseUrl', () => {
    const service = new BaseApiService({
      baseUrl: 'http://localhost:9090/',
      logger: mockLogger()
    })

    expect(service.buildUrl('/organisations/org-1')).toBe(
      'http://localhost:9090/organisations/org-1'
    )
  })

  test('getHeaders includes Basic auth when authMode is basic', () => {
    const service = new BaseApiService({
      authMode: 'basic',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      logger: mockLogger()
    })

    expect(service.getHeaders()).toEqual(
      expect.objectContaining({
        Accept: 'application/json',
        Authorization: expect.stringMatching(/^Basic /)
      })
    )
  })

  test('getHeaders excludes Authorization when authMode is none', () => {
    const service = new BaseApiService({
      authMode: 'none',
      clientId: 'Developer',
      clientSecret: 'developer-pwd',
      logger: mockLogger()
    })

    expect(service.getHeaders()).toEqual({ Accept: 'application/json' })
  })

  test('getTracingHeader returns header when value is provided', () => {
    const service = new BaseApiService({
      logger: mockLogger()
    })

    expect(service.getTracingHeader('trace-123')).toEqual({
      'x-cdp-request-id': 'trace-123'
    })
  })

  test('getTracingHeader returns empty object when value is missing', () => {
    const service = new BaseApiService({
      logger: mockLogger()
    })

    expect(service.getTracingHeader()).toEqual({})
  })

  test('getJson returns response json when request is successful', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: 'org-1' })
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost:9090',
      fetchImpl,
      logger: mockLogger()
    })

    const response = await service.getJson('/organisations/org-1')

    expect(response).toEqual({ id: 'org-1' })
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:9090/organisations/org-1',
      expect.objectContaining({ method: 'GET' })
    )
  })

  test('getJson returns cached response and skips fetch', async () => {
    const fetchImpl = vi.fn()
    const cacheClient = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ id: 'cached-org' })),
      set: vi.fn()
    }
    const service = new BaseApiService({
      baseUrl: 'http://localhost:9090',
      fetchImpl,
      cacheClient,
      logger: mockLogger()
    })

    const response = await service.getJson(
      '/organisations/org-1',
      undefined,
      'cache:key'
    )

    expect(response).toEqual({ id: 'cached-org' })
    expect(cacheClient.get).toHaveBeenCalledWith('cache:key')
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('getJson throws when request fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockResolvedValue({
        type: 'https://tools.ietf.org/html/rfc9110#section-15.6.1',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Something failed',
        traceId: 'trace-123'
      })
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost:9090',
      fetchImpl,
      logger: mockLogger()
    })

    await expect(
      service.getJson('/organisations/org-1')
    ).rejects.toBeInstanceOf(ApiError)
    await expect(service.getJson('/organisations/org-1')).rejects.toThrow(
      'base-api API request failed with status 500'
    )
    await expect(service.getJson('/organisations/org-1')).rejects.toMatchObject(
      {
        status: 500,
        title: 'Internal Server Error',
        detail: 'Something failed',
        traceId: 'trace-123'
      }
    )
  })

  test('getJson parses 404 and 500 with same problem+json shape', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: {
          get: vi.fn().mockReturnValue('application/problem+json')
        },
        json: vi.fn().mockResolvedValue({
          type: 'https://tools.ietf.org/html/rfc9110#section-15.5.5',
          title: 'Not Found',
          status: 404,
          detail: 'Organisation not found',
          traceId: 'trace-404'
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: {
          get: vi.fn().mockReturnValue('application/problem+json')
        },
        json: vi.fn().mockResolvedValue({
          type: 'https://tools.ietf.org/html/rfc9110#section-15.6.1',
          title: 'Internal Server Error',
          status: 500,
          detail: 'Unexpected server error',
          traceId: 'trace-500'
        })
      })
    const service = new BaseApiService({
      baseUrl: 'http://localhost:9090',
      fetchImpl,
      logger: mockLogger()
    })

    await expect(
      service.getJson('/organisations/missing')
    ).rejects.toMatchObject({
      status: 404,
      title: 'Not Found',
      detail: 'Organisation not found'
    })

    await expect(service.getJson('/organisations/error')).rejects.toMatchObject(
      {
        status: 500,
        title: 'Internal Server Error',
        detail: 'Unexpected server error'
      }
    )
  })

  test('getJson falls back to status message when response is not problem+json', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: {
        get: vi.fn().mockReturnValue('application/json')
      },
      json: vi.fn().mockResolvedValue({
        message: 'not used for non problem+json'
      })
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost:9090',
      fetchImpl,
      logger: mockLogger()
    })

    await expect(service.getJson('/organisations/org-1')).rejects.toMatchObject(
      {
        status: 404
      }
    )
    await expect(service.getJson('/organisations/org-1')).rejects.toThrow(
      'base-api API request failed with status 404'
    )
  })

  test('getJson handles problem+json when error body parsing throws', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: vi.fn().mockReturnValue('application/problem+json')
      },
      json: vi.fn().mockRejectedValue(new Error('invalid-json'))
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost:9090',
      fetchImpl,
      logger: mockLogger()
    })

    await expect(service.getJson('/organisations/org-1')).rejects.toMatchObject(
      {
        status: 500,
        detail: null,
        traceId: null
      }
    )
  })

  test('getJson falls back when response does not expose content-type getter', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 418,
      json: vi.fn().mockResolvedValue({ message: 'ignored' })
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost:9090',
      fetchImpl,
      logger: mockLogger()
    })

    await expect(service.getJson('/organisations/org-1')).rejects.toThrow(
      'base-api API request failed with status 418'
    )
  })

  test('getCachedJson returns parsed object for cache hit', async () => {
    const service = new BaseApiService({
      cacheClient: {
        get: vi.fn().mockResolvedValue(JSON.stringify({ id: 'org-1' })),
        set: vi.fn()
      },
      logger: mockLogger()
    })

    const value = await service.getCachedJson('cache:key')

    expect(value).toEqual({ id: 'org-1' })
  })

  test('setCachedJson writes value with ttl', async () => {
    const set = vi.fn().mockResolvedValue('OK')
    const service = new BaseApiService({
      cacheTtlMs: 1234,
      cacheClient: {
        get: vi.fn(),
        set
      },
      logger: mockLogger()
    })

    await service.setCachedJson('cache:key', { id: 'org-1' })

    expect(set).toHaveBeenCalledWith(
      'cache:key',
      JSON.stringify({ id: 'org-1' }),
      'PX',
      1234
    )
  })

  test('getCachedJson returns null when no cache client is available', async () => {
    const service = new BaseApiService({
      logger: mockLogger()
    })

    const value = await service.getCachedJson('cache:key')

    expect(value).toBeNull()
  })

  test('getCachedJson returns null when cache entry is empty', async () => {
    const service = new BaseApiService({
      cacheClient: {
        get: vi.fn().mockResolvedValue(''),
        set: vi.fn()
      },
      logger: mockLogger()
    })

    const value = await service.getCachedJson('cache:key')

    expect(value).toBeNull()
  })

  test('getCachedJson logs warning and returns null when cache read fails', async () => {
    const logger = mockLogger()
    const service = new BaseApiService({
      cacheClient: {
        get: vi.fn().mockRejectedValue(new Error('redis-read-failed')),
        set: vi.fn()
      },
      logger
    })

    const value = await service.getCachedJson('cache:key')

    expect(value).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ cacheKey: 'cache:key' }),
      'Unable to read cache entry'
    )
  })

  test('setCachedJson returns early when no cache client is available', async () => {
    const service = new BaseApiService({
      logger: mockLogger()
    })

    await expect(
      service.setCachedJson('cache:key', { id: 'org-1' })
    ).resolves.toBeUndefined()
  })

  test('setCachedJson logs warning when cache write fails', async () => {
    const logger = mockLogger()
    const service = new BaseApiService({
      cacheClient: {
        get: vi.fn(),
        set: vi.fn().mockRejectedValue(new Error('redis-write-failed'))
      },
      logger
    })

    await service.setCachedJson('cache:key', { id: 'org-1' })

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ cacheKey: 'cache:key' }),
      'Unable to set cache entry'
    )
  })
})
