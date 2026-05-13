import { describe, expect, test, vi } from 'vitest'

import { BaseApiService } from './base-api.service.js'

describe('BaseApiService', () => {
  test('getJson returns cached payload without calling fetch', async () => {
    const fetchImpl = vi.fn()
    const cacheClient = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ from: 'cache' })),
      set: vi.fn()
    }
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      cacheClient,
      serviceName: 'test-api'
    })

    const data = await service.getJson('/resource', {}, 'cache-key')

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
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      cacheClient,
      serviceName: 'test-api'
    })

    const data = await service.getJson('/resource', {}, 'cache-key')

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
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await expect(service.getJson('/fail', {}, 'ck')).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      title: 'Bad Gateway'
    })
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
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    const body = { a: 1 }
    const result = await service.postJson('/create', body, {})

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
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await expect(service.postJson('/noop', {}, {})).resolves.toBeNull()
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
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await service.postJson('/x', null, {})

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
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await expect(service.postJson('/x', {}, {})).rejects.toMatchObject({
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
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await expect(service.postJson('/x', {}, {})).resolves.toEqual(problem)
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
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    const body = { name: 'v2' }
    const result = await service.putJson('/resource/1', body, {})

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

  test('deleteJson returns null for 204 with no JSON body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: {
        get: vi.fn().mockReturnValue('')
      },
      json: vi.fn()
    })
    const service = new BaseApiService({
      baseUrl: 'http://localhost',
      fetchImpl,
      serviceName: 'upstream'
    })

    await expect(service.deleteJson('/resource/1', {})).resolves.toBeNull()
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost/resource/1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
