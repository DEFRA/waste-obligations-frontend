import { describe, expect, test, vi } from 'vitest'

import { config } from '#/config/config.js'
import {
  getCurrentRequestPath,
  recordNavigationHistory,
  resolveBackLinkHref,
  shouldRecordNavigationHistory
} from './back-link.js'
import * as navigationHistoryStore from './navigation-history-store.js'
import { setStoredNavigationPreviousUrl } from './navigation-history-store.js'

function mockRequest(overrides = {}) {
  const yarStore = new Map()
  const sessionId = 'test-session-id'

  return {
    method: 'get',
    path: '/producer/org/compliance/certificate/submit',
    url: { search: '?year=2026' },
    info: { host: 'localhost:8010' },
    headers: {},
    response: { statusCode: 200 },
    state: {
      session: { id: sessionId }
    },
    yar: {
      id: sessionId,
      get(key) {
        return yarStore.get(key)
      },
      set(key, value) {
        yarStore.set(key, value)
      },
      clear(key) {
        yarStore.delete(key)
      }
    },
    ...overrides
  }
}

describe('resolveBackLinkHref', () => {
  test('returns previous in-app path from session history', () => {
    const request = mockRequest()

    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate?year=2026'
    )
    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate/submit?year=2026'
    )

    expect(resolveBackLinkHref(request)).toBe(
      '/producer/org/compliance/certificate?year=2026'
    )
  })

  test('prefixes the previous in-app path for a reverse proxy', () => {
    const request = mockRequest({
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
    })

    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate?year=2026'
    )
    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate/submit?year=2026'
    )

    expect(resolveBackLinkHref(request)).toBe(
      '/manage-recycling-obligations/producer/org/compliance/certificate?year=2026'
    )
  })

  test('returns same-host referer when session history is missing', () => {
    const request = mockRequest({
      headers: {
        referer:
          'http://localhost:8010/producer/org/compliance/certificate?year=2026'
      }
    })

    expect(resolveBackLinkHref(request)).toBe(
      '/producer/org/compliance/certificate?year=2026'
    )
  })

  test('returns allowed external referer when session history is missing', () => {
    const request = mockRequest({
      headers: {
        referer:
          'https://localhost:7084/report-data/manage-your-recycling-obligations'
      }
    })

    expect(resolveBackLinkHref(request)).toBe(
      'https://localhost:7084/report-data/manage-your-recycling-obligations'
    )
  })

  test('falls back to EPR packaging home when no safe previous page exists', () => {
    expect(resolveBackLinkHref(mockRequest())).toBe(
      'https://localhost:7084/report-data'
    )
  })

  test('does not loop via referer after returning to an earlier page', () => {
    const request = mockRequest({
      path: '/producer/org/compliance/certificate',
      url: { search: '?year=2026' }
    })

    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate?year=2026'
    )
    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate/submit?year=2026'
    )
    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate?year=2026'
    )

    expect(
      resolveBackLinkHref(
        mockRequest({
          path: '/producer/org/compliance/certificate',
          url: { search: '?year=2026' },
          headers: {
            referer:
              'http://localhost:8010/producer/org/compliance/certificate/submit?year=2026'
          },
          yar: request.yar
        })
      )
    ).toBe('https://localhost:7084/report-data')
  })

  test('keeps the external landing page as back after in-app navigation', () => {
    const entryReferer =
      'https://localhost:7084/report-data/manage-your-recycling-obligations'
    const request = mockRequest({
      path: '/producer/org/compliance/certificate',
      url: { search: '?year=2026' },
      headers: { referer: entryReferer }
    })

    recordNavigationHistory(request)
    recordNavigationHistory(
      mockRequest({
        path: '/producer/org/compliance/certificate/submit',
        url: { search: '?year=2026' },
        yar: request.yar
      })
    )
    recordNavigationHistory(
      mockRequest({
        path: '/producer/org/compliance/certificate',
        url: { search: '?year=2026' },
        headers: {
          referer:
            'http://localhost:8010/producer/org/compliance/certificate/submit?year=2026'
        },
        yar: request.yar
      })
    )

    expect(
      resolveBackLinkHref(
        mockRequest({
          path: '/producer/org/compliance/certificate',
          url: { search: '?year=2026' },
          headers: {
            referer:
              'http://localhost:8010/producer/org/compliance/certificate/submit?year=2026'
          },
          yar: request.yar
        })
      )
    ).toBe(entryReferer)
  })

  test('falls back when navigation history lookup throws', () => {
    vi.spyOn(
      navigationHistoryStore,
      'getNavigationHistoryState'
    ).mockImplementation(() => {
      throw new Error('session unavailable')
    })

    const request = mockRequest({
      headers: {
        referer:
          'http://localhost:8010/producer/org/compliance/certificate?year=2026'
      }
    })

    expect(resolveBackLinkHref(request)).toBe(
      '/producer/org/compliance/certificate?year=2026'
    )

    vi.restoreAllMocks()
  })

  test('ignores malformed referer header values', () => {
    const request = mockRequest({
      headers: {
        referer: '::::not-a-valid-url'
      }
    })

    expect(resolveBackLinkHref(request)).toBe(
      'https://localhost:7084/report-data'
    )
  })

  test('ignores external referer when configured allow-list URL is invalid', () => {
    const originalGet = config.get.bind(config)
    vi.spyOn(config, 'get').mockImplementation((key) => {
      if (key === 'eprPackaging.manageAccountUrl') {
        return 'not-a-valid-url'
      }

      return originalGet(key)
    })

    const request = mockRequest({
      headers: {
        referer: 'https://localhost:7084/manage-account'
      }
    })

    expect(resolveBackLinkHref(request)).toBe(
      'https://localhost:7084/report-data'
    )

    vi.restoreAllMocks()
  })

  test('uses a proxy-prefixed same-host referer', () => {
    const request = mockRequest({
      headers: {
        'x-forwarded-prefix': '/manage-recycling-obligations',
        referer:
          'http://localhost:8010/manage-recycling-obligations/producer/org/compliance/certificate?year=2026'
      }
    })

    expect(resolveBackLinkHref(request)).toBe(
      '/manage-recycling-obligations/producer/org/compliance/certificate?year=2026'
    )
  })

  test('ignores referer that points to the current page', () => {
    const request = mockRequest({
      headers: {
        referer:
          'http://localhost:8010/producer/org/compliance/certificate/submit?year=2026'
      }
    })

    expect(resolveBackLinkHref(request)).toBe(
      'https://localhost:7084/report-data'
    )
  })

  test('ignores disallowed absolute URLs stored in history', () => {
    const request = mockRequest({
      path: '/producer/org/compliance/certificate',
      url: { search: '?year=2026' }
    })

    request.yar.set('navigationHistory', [
      'https://evil.example/phish',
      '/producer/org/compliance/certificate?year=2026'
    ])

    expect(resolveBackLinkHref(request)).toBe(
      'https://localhost:7084/report-data'
    )
  })

  test('ignores invalid absolute URLs when formatting history entries', () => {
    const request = mockRequest({
      path: '/producer/org/compliance/certificate',
      url: { search: '?year=2026' }
    })

    request.yar.set('navigationHistory', [
      'https://[::1',
      '/producer/org/compliance/certificate?year=2026'
    ])

    expect(resolveBackLinkHref(request)).toBe(
      'https://localhost:7084/report-data'
    )
  })

  test('falls back when history previous path is not a safe return path', () => {
    const request = mockRequest({
      path: '/producer/org/compliance/certificate',
      url: { search: '?year=2026' }
    })

    request.yar.set('navigationHistory', [
      '/evil://host',
      '/producer/org/compliance/certificate?year=2026'
    ])

    expect(resolveBackLinkHref(request)).toBe(
      'https://localhost:7084/report-data'
    )
  })
})

describe('navigation history recording', () => {
  test('seeds external entry referer when recording the first page', () => {
    const entryReferer =
      'https://localhost:7084/report-data/manage-your-recycling-obligations'
    const request = mockRequest({
      path: '/producer/org/compliance/certificate',
      url: { search: '?year=2026' },
      headers: { referer: entryReferer }
    })

    recordNavigationHistory(request)

    expect(request.yar.get('navigationHistory')).toEqual([
      entryReferer,
      '/producer/org/compliance/certificate?year=2026'
    ])
  })

  test('does not record failed responses', () => {
    const request = mockRequest({
      response: { statusCode: 404 }
    })

    recordNavigationHistory(request)

    expect(request.yar.get('navigationHistory')).toBeUndefined()
  })

  test('does not record public auth routes', () => {
    const request = mockRequest({
      path: '/signed-out',
      url: { search: '' }
    })

    expect(shouldRecordNavigationHistory(request, { statusCode: 200 })).toBe(
      false
    )
  })

  test('removes submitted form path after a successful POST redirect', () => {
    const request = mockRequest()

    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate?year=2026'
    )
    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate/submit?year=2026'
    )

    recordNavigationHistory(
      mockRequest({
        method: 'post',
        path: '/producer/org/compliance/certificate/submit',
        url: { search: '?year=2026' },
        response: { statusCode: 302 },
        yar: request.yar
      })
    )

    expect(request.yar.get('navigationHistory')).toEqual([
      '/producer/org/compliance/certificate?year=2026'
    ])
    expect(
      resolveBackLinkHref(
        mockRequest({
          path: '/producer/org/compliance/certificate/abc/success',
          url: { search: '' },
          yar: request.yar
        })
      )
    ).toBe('/producer/org/compliance/certificate?year=2026')
  })

  test('keeps form path in history when POST re-renders with validation errors', () => {
    const request = mockRequest()

    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate?year=2026'
    )
    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate/submit?year=2026'
    )

    recordNavigationHistory(
      mockRequest({
        method: 'post',
        path: '/producer/org/compliance/certificate/submit',
        url: { search: '?year=2026' },
        response: { statusCode: 200 },
        yar: request.yar
      })
    )

    expect(request.yar.get('navigationHistory')).toEqual([
      '/producer/org/compliance/certificate?year=2026',
      '/producer/org/compliance/certificate/submit?year=2026'
    ])
  })

  test('swallows session errors while recording history', () => {
    const request = mockRequest()
    request.yar.set = () => {
      throw new Error('session unavailable')
    }

    expect(() => recordNavigationHistory(request)).not.toThrow()
  })

  test('does not record non-GET requests that are not successful redirects', () => {
    const request = mockRequest({
      method: 'post',
      response: { statusCode: 500 }
    })

    recordNavigationHistory(request)

    expect(request.yar.get('navigationHistory')).toBeUndefined()
  })

  test('getCurrentRequestPath includes query string', () => {
    expect(getCurrentRequestPath(mockRequest())).toBe(
      '/producer/org/compliance/certificate/submit?year=2026'
    )
  })
})
