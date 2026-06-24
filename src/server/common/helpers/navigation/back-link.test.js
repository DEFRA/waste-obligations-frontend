import { describe, expect, test } from 'vitest'

import {
  getCurrentRequestPath,
  recordNavigationHistory,
  resolveBackLinkHref,
  shouldRecordNavigationHistory
} from './back-link.js'
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
