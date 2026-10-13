import { vi } from 'vitest'

import {
  authenticate,
  cookieHeadersFromResponse,
  injectAuthed
} from './auth-helper.js'

describe('auth-helper', () => {
  test('cookieHeadersFromResponse returns empty object when no cookies are set', () => {
    expect(cookieHeadersFromResponse({ headers: {} })).toEqual({})
  })

  test('cookieHeadersFromResponse joins multiple set-cookie headers', () => {
    const headers = cookieHeadersFromResponse({
      headers: {
        'set-cookie': [
          'waste-obligations-session=abc; Path=/; HttpOnly',
          'waste-obligations-oauth-state=state; Path=/'
        ]
      }
    })

    expect(headers).toEqual({
      cookie:
        'waste-obligations-session=abc; waste-obligations-oauth-state=state'
    })
  })

  test('authenticate stubs backend account API and calls sign-in', async () => {
    const server = {
      app: {},
      inject: vi.fn().mockResolvedValue({
        statusCode: 302,
        headers: {
          'set-cookie': 'waste-obligations-session=abc; Path=/; HttpOnly'
        }
      })
    }

    await expect(authenticate(server)).resolves.toEqual({
      cookie: 'waste-obligations-session=abc'
    })
    expect(server.app.backendAccountApi.getUserOrganisations).toBeTypeOf(
      'function'
    )
    expect(server.inject).toHaveBeenCalledWith({
      method: 'GET',
      url: '/signin-oidc'
    })
  })

  test('authenticate throws when sign-in fails', async () => {
    const server = {
      app: {},
      inject: vi.fn().mockResolvedValue({
        statusCode: 401,
        result: 'Unauthorized'
      })
    }

    await expect(authenticate(server)).rejects.toThrow(
      'Test sign-in failed with status 401'
    )
  })

  test('injectAuthed merges auth cookie headers with request headers', async () => {
    const server = {
      inject: vi.fn().mockResolvedValue({ statusCode: 200 })
    }

    await injectAuthed(
      server,
      { method: 'GET', url: '/', headers: { accept: 'text/html' } },
      { cookie: 'waste-obligations-session=abc' }
    )

    expect(server.inject).toHaveBeenCalledWith({
      method: 'GET',
      url: '/',
      headers: {
        cookie: 'waste-obligations-session=abc',
        accept: 'text/html'
      }
    })
  })
})
