import { describe, expect, test, vi } from 'vitest'

import { ApiError } from '#/server/services/base/api-error.js'
import { BackendAccountApiService } from './backend-account-api.service.js'

function createService(fetchImpl) {
  return new BackendAccountApiService({
    baseUrl: 'http://localhost:8003/api/',
    authMode: 'bearer',
    fetchImpl,
    getAccessToken: vi.fn().mockResolvedValue('access-token')
  })
}

describe('BackendAccountApiService', () => {
  test('getUserOrganisations returns parsed JSON on success', async () => {
    const payload = {
      user: {
        email: 'user@example.com',
        service: 'EPR Packaging',
        serviceRole: 'Approved Person',
        organisations: [{ organisationNumber: '154977' }]
      }
    }
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(payload)
    })
    const service = createService(fetchImpl)

    const result = await service.getUserOrganisations(
      'a1111111-2222-3333-4444-555555555555',
      'trace-1'
    )

    expect(result).toEqual(payload)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://localhost:8003/api/users/user-organisations?userId=a1111111-2222-3333-4444-555555555555',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token'
        })
      })
    )
  })

  test('getUserOrganisations throws ApiError on 404', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: vi.fn().mockReturnValue('') }
    })
    const service = createService(fetchImpl)

    await expect(
      service.getUserOrganisations('missing-user')
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 404
    })
  })

  test('getUserOrganisations rethrows non-404 errors', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: { get: vi.fn().mockReturnValue('') }
    })
    const service = createService(fetchImpl)

    await expect(service.getUserOrganisations('user-1')).rejects.toBeInstanceOf(
      ApiError
    )
  })
})
