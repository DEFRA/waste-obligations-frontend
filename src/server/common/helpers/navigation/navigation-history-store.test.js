import { describe, expect, test } from 'vitest'

import {
  clearNavigationHistory,
  getNavigationHistoryState,
  isBlockedNavigationPath,
  removeStoredNavigationPath,
  setStoredNavigationPreviousUrl
} from './navigation-history-store.js'

function mockRequest() {
  const yarStore = new Map()

  return {
    yar: {
      get(key) {
        return yarStore.get(key)
      },
      set(key, value) {
        yarStore.set(key, value)
      },
      clear(key) {
        yarStore.delete(key)
      }
    }
  }
}

describe('navigation-history-store', () => {
  test('appends paths and truncates when revisiting an earlier page', () => {
    const request = mockRequest()

    setStoredNavigationPreviousUrl(request, '/a')
    setStoredNavigationPreviousUrl(request, '/a')
    setStoredNavigationPreviousUrl(request, '/b')
    setStoredNavigationPreviousUrl(request, '/c')
    setStoredNavigationPreviousUrl(request, '/a')

    expect(request.yar.get('navigationHistory')).toEqual(['/a'])
    expect(getNavigationHistoryState(request, { excludePath: '/a' })).toEqual({
      previousUrl: null,
      currentInHistory: true
    })
  })

  test('seeds an external entry referer when history is empty', () => {
    const request = mockRequest()
    const entryReferer =
      'https://localhost:7084/report-data/manage-your-recycling-obligations'

    setStoredNavigationPreviousUrl(request, '/certificate?year=2026', {
      entryReferer
    })

    expect(request.yar.get('navigationHistory')).toEqual([
      entryReferer,
      '/certificate?year=2026'
    ])
    expect(
      getNavigationHistoryState(request, {
        excludePath: '/certificate?year=2026'
      })
    ).toEqual({
      previousUrl: entryReferer,
      currentInHistory: true
    })
  })

  test('ignores invalid paths when storing', () => {
    const request = mockRequest()

    setStoredNavigationPreviousUrl(request, 'https://evil.example')
    setStoredNavigationPreviousUrl(request, null)

    expect(request.yar.get('navigationHistory')).toBeUndefined()
  })

  test('removes and blocks submitted form paths', () => {
    const request = mockRequest()

    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate?year=2026'
    )
    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate/submit?year=2026'
    )

    removeStoredNavigationPath(
      request,
      '/producer/org/compliance/certificate/submit?year=2026'
    )

    expect(request.yar.get('navigationHistory')).toEqual([
      '/producer/org/compliance/certificate?year=2026'
    ])
    expect(
      isBlockedNavigationPath(
        request,
        '/producer/org/compliance/certificate/submit?year=2026'
      )
    ).toBe(true)
  })

  test('blocks a submitted path even when it was not already in history', () => {
    const request = mockRequest()

    removeStoredNavigationPath(
      request,
      '/producer/org/compliance/certificate/submit?year=2026'
    )

    expect(
      isBlockedNavigationPath(
        request,
        '/producer/org/compliance/certificate/submit'
      )
    ).toBe(true)
  })

  test('unblocks a path when it is recorded again', () => {
    const request = mockRequest()

    removeStoredNavigationPath(
      request,
      '/producer/org/compliance/certificate/submit?year=2026'
    )
    setStoredNavigationPreviousUrl(
      request,
      '/producer/org/compliance/certificate/submit?year=2026'
    )

    expect(
      isBlockedNavigationPath(
        request,
        '/producer/org/compliance/certificate/submit?year=2026'
      )
    ).toBe(false)
  })

  test('returns the previous stack entry for the current page', () => {
    const request = mockRequest()

    setStoredNavigationPreviousUrl(request, '/a')
    setStoredNavigationPreviousUrl(request, '/b?year=2026')
    setStoredNavigationPreviousUrl(request, '/c')

    expect(
      getNavigationHistoryState(request, { excludePath: '/b?year=2026' })
    ).toEqual({
      previousUrl: '/a',
      currentInHistory: true
    })
    expect(getNavigationHistoryState(request, { excludePath: '/c' })).toEqual({
      previousUrl: '/b?year=2026',
      currentInHistory: true
    })
  })

  test('keeps the external entry referer after navigating back', () => {
    const request = mockRequest()
    const entryReferer =
      'https://localhost:7084/report-data/manage-your-recycling-obligations'

    setStoredNavigationPreviousUrl(request, '/certificate?year=2026', {
      entryReferer
    })
    setStoredNavigationPreviousUrl(request, '/certificate/submit?year=2026')
    setStoredNavigationPreviousUrl(request, '/certificate?year=2026')

    expect(request.yar.get('navigationHistory')).toEqual([
      entryReferer,
      '/certificate?year=2026'
    ])
    expect(
      getNavigationHistoryState(request, {
        excludePath: '/certificate?year=2026'
      })
    ).toEqual({
      previousUrl: entryReferer,
      currentInHistory: true
    })
  })

  test('clears navigation history from the session', () => {
    const request = mockRequest()

    setStoredNavigationPreviousUrl(request, '/a')
    clearNavigationHistory(request)

    expect(request.yar.get('navigationHistory')).toBeUndefined()
  })

  test('skips blocked paths when resolving the previous stack entry', () => {
    const request = mockRequest()

    request.yar.set('navigationHistory', ['/a', '/b', '/c'])
    request.yar.set('navigationBlockedPaths', ['/b'])

    expect(getNavigationHistoryState(request, { excludePath: '/c' })).toEqual({
      previousUrl: '/a',
      currentInHistory: true
    })
  })

  test('matches current page by pathname when query strings differ', () => {
    const request = mockRequest()

    setStoredNavigationPreviousUrl(request, '/page?year=2024')
    setStoredNavigationPreviousUrl(request, '/other')

    expect(
      getNavigationHistoryState(request, { excludePath: '/page?year=2026' })
    ).toEqual({
      previousUrl: null,
      currentInHistory: true
    })
    expect(request.yar.get('navigationHistory')).toEqual([
      '/page?year=2024',
      '/other'
    ])

    setStoredNavigationPreviousUrl(request, '/page?year=2026')

    expect(request.yar.get('navigationHistory')).toEqual(['/page?year=2026'])
  })

  test('caps stored history at the maximum length', () => {
    const request = mockRequest()

    for (let index = 0; index < 25; index += 1) {
      setStoredNavigationPreviousUrl(request, `/page-${index}`)
    }

    const history = request.yar.get('navigationHistory')

    expect(history).toHaveLength(20)
    expect(history[0]).toBe('/page-5')
    expect(history.at(-1)).toBe('/page-24')
  })

  test('returns null previous URL for empty or invalid history', () => {
    const request = mockRequest()

    expect(getNavigationHistoryState(request)).toEqual({
      previousUrl: null,
      currentInHistory: false
    })

    request.yar.set('navigationHistory', 'not-an-array')

    expect(getNavigationHistoryState(request)).toEqual({
      previousUrl: null,
      currentInHistory: false
    })
  })

  test('ignores invalid remove paths', () => {
    const request = mockRequest()

    setStoredNavigationPreviousUrl(request, '/a')
    removeStoredNavigationPath(request, 'https://evil.example')
    removeStoredNavigationPath(request, null)

    expect(request.yar.get('navigationHistory')).toEqual(['/a'])
  })
})
