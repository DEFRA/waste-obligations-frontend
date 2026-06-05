import { afterEach, describe, expect, test, vi } from 'vitest'

const getTraceId = vi.hoisted(() => vi.fn(() => 'trace-id'))

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

import {
  getServiceOAuthAccessToken,
  resetServiceOAuthTokenCacheForTests
} from './oauth-token.js'

function createCacheClient() {
  const redisStore = new Map()

  return {
    get: vi.fn(async (key) => redisStore.get(key) ?? null),
    set: vi.fn(async (key, value) => {
      redisStore.set(key, value)
    })
  }
}

function createOAuthOptions(overrides = {}) {
  return {
    clientId: 'client-id',
    clientSecret: 'client-secret',
    tokenEndpoint: 'https://login.example/oauth2/v2.0/token',
    scope: 'api://resource/.default',
    cacheClient: createCacheClient(),
    cacheTtlMs: 300000,
    fetchImpl: vi.fn(),
    logger: { warn: vi.fn() },
    tracingHeader: 'x-cdp-request-id',
    ...overrides
  }
}

function createTokenResponse(accessToken = 'service-token') {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      access_token: accessToken,
      expires_in: 3600
    })
  }
}

describe('getServiceOAuthAccessToken', () => {
  afterEach(() => {
    resetServiceOAuthTokenCacheForTests()
  })

  test('requests and caches a client credentials token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(createTokenResponse())
    const options = createOAuthOptions({ fetchImpl })

    const first = await getServiceOAuthAccessToken(options)
    const second = await getServiceOAuthAccessToken(options)

    expect(first).toBe('service-token')
    expect(second).toBe('service-token')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith(
      options.tokenEndpoint,
      expect.objectContaining({
        method: 'POST',
        body: expect.any(URLSearchParams)
      })
    )
    expect(String(fetchImpl.mock.calls[0][1].body)).toContain(
      'grant_type=client_credentials'
    )
  })

  test('reads and writes OAuth tokens in redis cache', async () => {
    const cacheClient = createCacheClient()
    const fetchImpl = vi.fn().mockResolvedValue(createTokenResponse())
    const options = createOAuthOptions({ fetchImpl, cacheClient })

    const first = await getServiceOAuthAccessToken(options)
    const second = await getServiceOAuthAccessToken(options)

    expect(first).toBe('service-token')
    expect(second).toBe('service-token')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(cacheClient.get).toHaveBeenCalledWith(
      'oauth-token:client-id:api://resource/.default'
    )
    expect(cacheClient.set).toHaveBeenCalledWith(
      'oauth-token:client-id:api://resource/.default',
      'service-token',
      'PX',
      expect.any(Number)
    )
  })

  test('throws when OAuth options are not valid', async () => {
    await expect(
      getServiceOAuthAccessToken({
        clientId: '',
        clientSecret: '',
        tokenEndpoint: '',
        scope: ''
      })
    ).rejects.toThrow(/not valid/)
  })

  test('adds trace header to token request from request context', async () => {
    getTraceId.mockReturnValue('trace-123')

    const logger = { warn: vi.fn() }
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(createTokenResponse('traced-token'))
    const options = createOAuthOptions({
      fetchImpl,
      logger
    })

    await getServiceOAuthAccessToken(options)

    expect(fetchImpl).toHaveBeenCalledWith(
      options.tokenEndpoint,
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-cdp-request-id': 'trace-123'
        })
      })
    )
  })

  test('logs token request failures with response status', async () => {
    const logger = { warn: vi.fn() }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    })
    const options = createOAuthOptions({ fetchImpl, logger })

    await expect(getServiceOAuthAccessToken(options)).rejects.toThrow(
      /401 Unauthorized/
    )

    expect(logger.warn).toHaveBeenCalledWith(
      { status: 401, statusText: 'Unauthorized' },
      'OAuth client credentials token request failed'
    )
  })

  test('logs and fetches token when OAuth cache read fails', async () => {
    const logger = { warn: vi.fn() }
    const cacheClient = {
      get: vi.fn().mockRejectedValue(new Error('redis-read-failed')),
      set: vi.fn().mockResolvedValue(undefined)
    }
    const fetchImpl = vi.fn().mockResolvedValue(createTokenResponse())
    const options = createOAuthOptions({ fetchImpl, cacheClient, logger })

    const token = await getServiceOAuthAccessToken(options)

    expect(token).toBe('service-token')
    expect(logger.warn).toHaveBeenCalledWith(
      {
        err: expect.any(Error),
        cacheKey: 'oauth-token:client-id:api://resource/.default'
      },
      'Unable to read OAuth token from cache'
    )
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('logs and returns token when OAuth cache write fails', async () => {
    const logger = { warn: vi.fn() }
    const cacheClient = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockRejectedValue(new Error('redis-write-failed'))
    }
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(createTokenResponse('fresh-token'))
    const options = createOAuthOptions({ fetchImpl, cacheClient, logger })

    const token = await getServiceOAuthAccessToken(options)

    expect(token).toBe('fresh-token')
    expect(logger.warn).toHaveBeenCalledWith(
      {
        err: expect.any(Error),
        cacheKey: 'oauth-token:client-id:api://resource/.default'
      },
      'Unable to write OAuth token to cache'
    )
  })

  test('omits trace header when request context has no trace id', async () => {
    getTraceId.mockReturnValue(null)

    const fetchImpl = vi.fn().mockResolvedValue(createTokenResponse())
    const options = createOAuthOptions({ fetchImpl })

    await getServiceOAuthAccessToken(options)

    expect(fetchImpl).toHaveBeenCalledWith(
      options.tokenEndpoint,
      expect.objectContaining({
        headers: expect.not.objectContaining({
          'x-cdp-request-id': expect.anything()
        })
      })
    )
  })

  test('throws when token response omits access_token', async () => {
    const logger = { warn: vi.fn() }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ expires_in: 3600 })
    })
    const options = createOAuthOptions({ fetchImpl, logger })

    await expect(getServiceOAuthAccessToken(options)).rejects.toThrow(
      /did not include access_token/
    )

    expect(logger.warn).toHaveBeenCalledWith(
      'OAuth token response did not include access_token'
    )
  })
})
