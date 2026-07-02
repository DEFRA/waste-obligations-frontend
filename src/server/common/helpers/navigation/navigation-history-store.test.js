import { describe, expect, test } from 'vitest'

import {
  clearNavigationHistoryStore,
  getStoredNavigationPreviousUrl,
  setStoredNavigationPreviousUrl
} from './navigation-history-store.js'

describe('navigation-history-store', () => {
  beforeEach(() => {
    clearNavigationHistoryStore()
  })

  test('returns null when session id cannot be resolved', () => {
    const request = {
      state: {},
      yar: {
        get id() {
          throw new Error('yar unavailable')
        }
      }
    }

    expect(getStoredNavigationPreviousUrl(request)).toBeNull()
  })

  test('stores and reads previous path for a session', () => {
    const request = {
      state: { session: { id: 'session-1' } },
      yar: { id: 'session-1' }
    }

    setStoredNavigationPreviousUrl(
      request,
      '/compliance/producer/org/certificate?year=2026'
    )

    expect(getStoredNavigationPreviousUrl(request)).toBe(
      '/compliance/producer/org/certificate?year=2026'
    )
  })
})
