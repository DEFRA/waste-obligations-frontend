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
          'session=abc; Path=/; HttpOnly',
          'bell-azure-ad-b2c=state; Path=/'
        ]
      }
    })

    expect(headers).toEqual({
      cookie: 'session=abc; bell-azure-ad-b2c=state'
    })
  })

  test('authenticate returns cookie headers from sign-in', async () => {
    const server = {
      inject: vi.fn().mockResolvedValue({
        headers: {
          'set-cookie': 'session=abc; Path=/; HttpOnly'
        }
      })
    }

    await expect(authenticate(server)).resolves.toEqual({
      cookie: 'session=abc'
    })
    expect(server.inject).toHaveBeenCalledWith({
      method: 'GET',
      url: '/signin-oidc'
    })
  })

  test('injectAuthed merges auth cookie headers with request headers', async () => {
    const server = {
      inject: vi.fn().mockResolvedValue({ statusCode: 200 })
    }

    await injectAuthed(
      server,
      { method: 'GET', url: '/', headers: { accept: 'text/html' } },
      { cookie: 'session=abc' }
    )

    expect(server.inject).toHaveBeenCalledWith({
      method: 'GET',
      url: '/',
      headers: {
        cookie: 'session=abc',
        accept: 'text/html'
      }
    })
  })
})
