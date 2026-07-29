import { describe, expect, test, vi } from 'vitest'

import { config } from '#/config/config.js'
import {
  getCurrentRequestPath,
  recordNavigationHistory,
  resolveBackLinkHref,
  shouldRecordNavigationHistory
} from './back-link.js'
import * as navigationHistoryStore from './navigation-history-store.js'
import {
  clearNavigationHistoryStore,
  setStoredNavigationPreviousUrl
} from './navigation-history-store.js'

function mockRequest(overrides = {}) {
  const yarStore = new Map()
  const sessionId = 'test-session-id'

  return {
    method: 'get',
    path: '/compliance/producer/org/certificate/submit',
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
      }
    },
    ...overrides
  }
}

describe('resolveBackLinkHref', () => {
  beforeEach(() => {
    clearNavigationHistoryStore()
  })

  test('returns previous in-app path from session', () => {
    const request = mockRequest()
    setStoredNavigationPreviousUrl(
      request,
      '/compliance/producer/org/certificate?year=2026'
    )

    expect(resolveBackLinkHref(request)).toBe(
      '/compliance/producer/org/certificate?year=2026'
    )
  })

  test('prefixes the previous in-app path for a reverse proxy', () => {
    const request = mockRequest({
      headers: { 'x-forwarded-prefix': '/manage-recycling-obligations' }
    })
    setStoredNavigationPreviousUrl(
      request,
      '/compliance/producer/org/certificate?year=2026'
    )

    expect(resolveBackLinkHref(request)).toBe(
      '/manage-recycling-obligations/compliance/producer/org/certificate?year=2026'
    )
  })

  test('returns same-host referer when session history is missing', () => {
    const request = mockRequest({
      headers: {
        referer:
          'http://localhost:8010/compliance/producer/org/certificate?year=2026'
      }
    })

    expect(resolveBackLinkHref(request)).toBe(
      '/compliance/producer/org/certificate?year=2026'
    )
  })

  test('uses a proxy-prefixed same-host referer', () => {
    const request = mockRequest({
      headers: {
        'x-forwarded-prefix': '/manage-recycling-obligations',
        referer:
          'http://localhost:8010/manage-recycling-obligations/compliance/producer/org/certificate?year=2026'
      }
    })

    expect(resolveBackLinkHref(request)).toBe(
      '/manage-recycling-obligations/compliance/producer/org/certificate?year=2026'
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

  test('ignores referer that points to the current page', () => {
    const request = mockRequest({
      headers: {
        referer:
          'http://localhost:8010/compliance/producer/org/certificate/submit?year=2026'
      }
    })

    expect(resolveBackLinkHref(request)).toBe(
      'https://localhost:7084/report-data'
    )
  })

  test('falls back when navigation history lookup throws', () => {
    vi.spyOn(
      navigationHistoryStore,
      'getStoredNavigationPreviousUrl'
    ).mockImplementation(() => {
      throw new Error('session unavailable')
    })

    const request = mockRequest({
      headers: {
        referer:
          'http://localhost:8010/compliance/producer/org/certificate?year=2026'
      }
    })

    expect(resolveBackLinkHref(request)).toBe(
      '/compliance/producer/org/certificate?year=2026'
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
})

describe('navigation history recording', () => {
  beforeEach(() => {
    clearNavigationHistoryStore()
  })

  test('records successful GET requests for app pages', () => {
    const request = mockRequest()

    recordNavigationHistory(request)

    expect(
      resolveBackLinkHref({
        ...request,
        path: '/compliance/producer/org/certificate',
        url: { search: '?year=2026' }
      })
    ).toBe('/compliance/producer/org/certificate/submit?year=2026')
  })

  test('does not record failed responses', () => {
    const request = mockRequest({
      response: { statusCode: 404 }
    })

    recordNavigationHistory(request)

    expect(resolveBackLinkHref(request)).toBe(
      'https://localhost:7084/report-data'
    )
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

  test('getCurrentRequestPath includes query string', () => {
    expect(getCurrentRequestPath(mockRequest())).toBe(
      '/compliance/producer/org/certificate/submit?year=2026'
    )
  })
})
