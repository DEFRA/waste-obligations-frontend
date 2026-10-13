import { describe, expect, test, vi } from 'vitest'

import { fetchWithResilience } from './request-resilience.js'

function response(status, retryAfter = null) {
  return {
    status,
    headers: {
      get: (name) => (name === 'retry-after' ? retryAfter : null)
    }
  }
}

describe('fetchWithResilience', () => {
  test('throws a timeout error when the total request budget is exhausted', async () => {
    const now = vi.fn().mockReturnValueOnce(0).mockReturnValue(101)
    const fetchImpl = vi.fn()

    await expect(
      fetchWithResilience({
        fetchImpl,
        url: 'https://example.test/resource',
        resilience: { totalTimeoutMs: 100 },
        now
      })
    ).rejects.toThrow('Downstream request timed out')

    expect(fetchImpl).not.toHaveBeenCalled()
  })

  test('retries after an attempt timeout', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(
        (_url, request) =>
          new Promise((_resolve, reject) => {
            request.signal.addEventListener(
              'abort',
              () => reject(request.signal.reason),
              { once: true }
            )
          })
      )
      .mockResolvedValueOnce(response(200))

    await expect(
      fetchWithResilience({
        fetchImpl,
        url: 'https://example.test/resource',
        retry: true,
        resilience: {
          totalTimeoutMs: 100,
          attemptTimeoutMs: 5,
          maxRetryAttempts: 1,
          retryDelayMs: 0
        }
      })
    ).resolves.toMatchObject({ status: 200 })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  test('honours a zero-second Retry-After response', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(429, '0'))
      .mockResolvedValueOnce(response(200))

    await expect(
      fetchWithResilience({
        fetchImpl,
        url: 'https://example.test/resource',
        retry: true
      })
    ).resolves.toMatchObject({ status: 200 })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
})
