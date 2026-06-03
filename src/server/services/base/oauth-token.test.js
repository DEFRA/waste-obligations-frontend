import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  getServiceOAuthAccessToken,
  resetServiceOAuthTokenCacheForTests
} from './oauth-token.js'

describe('getServiceOAuthAccessToken', () => {
  afterEach(() => {
    resetServiceOAuthTokenCacheForTests()
  })

  test('requests and caches a client credentials token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        access_token: 'service-token',
        expires_in: 3600
      })
    })

    const oauth = {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      tokenEndpoint: 'https://login.example/oauth2/v2.0/token',
      scope: 'api://resource/.default'
    }

    const first = await getServiceOAuthAccessToken({ fetchImpl, oauth })
    const second = await getServiceOAuthAccessToken({ fetchImpl, oauth })

    expect(first).toBe('service-token')
    expect(second).toBe('service-token')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl).toHaveBeenCalledWith(
      oauth.tokenEndpoint,
      expect.objectContaining({
        method: 'POST',
        body: expect.any(URLSearchParams)
      })
    )
    expect(String(fetchImpl.mock.calls[0][1].body)).toContain(
      'grant_type=client_credentials'
    )
  })

  test('throws when OAuth is not configured', async () => {
    await expect(
      getServiceOAuthAccessToken({
        oauth: { clientId: '', clientSecret: '', tokenEndpoint: '' }
      })
    ).rejects.toThrow(/not configured/)
  })

  test('uses provided logger and trace id on token request', async () => {
    const logger = { warn: vi.fn() }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        access_token: 'traced-token',
        expires_in: 3600
      })
    })

    const oauth = {
      clientId: 'client-id',
      clientSecret: 'client-secret',
      tokenEndpoint: 'https://login.example/oauth2/v2.0/token'
    }

    await getServiceOAuthAccessToken({
      fetchImpl,
      oauth,
      logger,
      traceId: 'trace-123',
      tracingHeader: 'x-cdp-request-id'
    })

    expect(fetchImpl).toHaveBeenCalledWith(
      oauth.tokenEndpoint,
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

    await expect(
      getServiceOAuthAccessToken({
        fetchImpl,
        oauth: {
          clientId: 'client-id',
          clientSecret: 'client-secret',
          tokenEndpoint: 'https://login.example/oauth2/v2.0/token'
        },
        logger
      })
    ).rejects.toThrow(/401 Unauthorized/)

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

    await expect(
      getServiceOAuthAccessToken({
        fetchImpl,
        oauth: {
          clientId: 'client-id',
          clientSecret: 'client-secret',
          tokenEndpoint: 'https://login.example/oauth2/v2.0/token'
        },
        logger
      })
    ).rejects.toThrow(/did not include access_token/)

    expect(logger.warn).toHaveBeenCalledWith(
      'OAuth token response did not include access_token'
    )
  })
})
