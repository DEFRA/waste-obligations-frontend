import { beforeEach, describe, expect, test, vi } from 'vitest'

const isLoadTestRequest = vi.hoisted(() => vi.fn())

vi.mock('#/server/common/helpers/load-test/request-context.js', () => ({
  isLoadTestRequest
}))

import { refreshSessionUser } from './refresh-session-user.js'

function buildRequest() {
  const user = { id: '579c319d-d552-47a2-bf4c-5a125a3183bc', organisations: [] }

  return {
    yar: {
      get: vi.fn().mockReturnValue(user),
      set: vi.fn()
    },
    server: {
      app: {
        backendAccountApi: {
          getUserOrganisations: vi.fn().mockResolvedValue({
            user: {
              id: user.id,
              organisations: [{ id: 'generated-organisation-id' }]
            }
          })
        }
      }
    }
  }
}

describe('refreshSessionUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isLoadTestRequest.mockReturnValue(false)
  })

  test('persists an ordinary account-service refresh in the user session', async () => {
    const request = buildRequest()

    await refreshSessionUser(request)

    expect(
      request.server.app.backendAccountApi.getUserOrganisations
    ).toHaveBeenCalledWith('579c319d-d552-47a2-bf4c-5a125a3183bc')
    expect(request.yar.set).toHaveBeenCalledWith(
      'user',
      expect.objectContaining({
        organisations: [{ id: 'generated-organisation-id' }]
      })
    )
  })

  test('keeps a load-test account response request-local', async () => {
    const request = buildRequest()
    isLoadTestRequest.mockReturnValue(true)

    const user = await refreshSessionUser(request)

    expect(
      request.server.app.backendAccountApi.getUserOrganisations
    ).toHaveBeenCalledWith('579c319d-d552-47a2-bf4c-5a125a3183bc')
    expect(user.organisations).toEqual([{ id: 'generated-organisation-id' }])
    expect(request.yar.set).not.toHaveBeenCalled()
  })
})
