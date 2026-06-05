import { afterEach, describe, expect, test, vi } from 'vitest'

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
    traceId: 'trace-id',
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

  test('uses provided logger and trace id on token request', async () => {
    const logger = { warn: vi.fn() }
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(createTokenResponse('traced-token'))
    const options = createOAuthOptions({
      fetchImpl,
      logger,
      traceId: 'trace-123'
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
