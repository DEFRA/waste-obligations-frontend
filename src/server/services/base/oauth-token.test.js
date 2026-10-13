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

  test('retries a transient token endpoint response', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        headers: { get: () => null }
      })
      .mockResolvedValueOnce(createTokenResponse())
    const options = createOAuthOptions({
      fetchImpl,
      resilience: { retryDelayMs: 0 }
    })

    await expect(getServiceOAuthAccessToken(options)).resolves.toBe(
      'service-token'
    )
    expect(fetchImpl).toHaveBeenCalledTimes(2)
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

  test('combines an optional abort signal with the token request timeout', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn(
      (_url, request) =>
        new Promise((_resolve, reject) => {
          if (request.signal.aborted) {
            reject(request.signal.reason)
            return
          }

          request.signal.addEventListener(
            'abort',
            () => reject(request.signal.reason),
            {
              once: true
            }
          )
        })
    )
    const options = createOAuthOptions({
      fetchImpl,
      signal: controller.signal
    })

    const token = getServiceOAuthAccessToken(options)
    controller.abort(new Error('request cancelled'))

    await expect(token).rejects.toThrow('request cancelled')
    expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
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
      'OAuth client credentials token request failed: status=401, statusText=Unauthorized'
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
      { err: expect.any(Error) },
      'Unable to read OAuth token from cache (oauth-token:client-id:api://resource/.default)'
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
      { err: expect.any(Error) },
      'Unable to write OAuth token to cache: cacheKey=oauth-token:client-id:api://resource/.default'
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

  test('deduplicates concurrent token refresh requests', async () => {
    let resolveFetch
    const fetchImpl = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )
    const options = createOAuthOptions({ fetchImpl })

    const first = getServiceOAuthAccessToken(options)
    const second = getServiceOAuthAccessToken(options)

    resolveFetch(createTokenResponse('shared-token'))

    const [token1, token2] = await Promise.all([first, second])

    expect(token1).toBe('shared-token')
    expect(token2).toBe('shared-token')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  test('uses default expiry when token response omits expires_in', async () => {
    const cacheClient = createCacheClient()
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        access_token: 'token-without-expiry'
      })
    })
    const options = createOAuthOptions({ fetchImpl, cacheClient })

    const token = await getServiceOAuthAccessToken(options)

    expect(token).toBe('token-without-expiry')
    expect(cacheClient.set).toHaveBeenCalledWith(
      'oauth-token:client-id:api://resource/.default',
      'token-without-expiry',
      'PX',
      3540000
    )
  })
})
