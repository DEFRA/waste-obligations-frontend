import { describe, expect, test, vi } from 'vitest'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { applyCookieConsentToView } from './cookie-consent.js'

function createViewRequest({
  statusCode = statusCodes.ok,
  context = {},
  path = '/cookies',
  search = '',
  state = {}
} = {}) {
  return {
    path,
    url: { search },
    state,
    response: {
      variety: 'view',
      statusCode,
      source: { context },
      header: vi.fn()
    }
  }
}

describe('applyCookieConsentToView', () => {
  test('ignores non-view responses', () => {
    const h = { continue: Symbol('continue') }
    const result = applyCookieConsentToView(
      { response: { variety: 'plain' } },
      h
    )

    expect(result).toBe(h.continue)
  })

  test('ignores view responses without a source', () => {
    const h = { continue: Symbol('continue') }
    const result = applyCookieConsentToView(
      { response: { variety: 'view', source: null } },
      h
    )

    expect(result).toBe(h.continue)
  })

  test('ignores forbidden view responses', () => {
    const request = createViewRequest({ statusCode: statusCodes.forbidden })
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    applyCookieConsentToView(request, h)

    expect(request.response.header).not.toHaveBeenCalled()
    expect(h.state).not.toHaveBeenCalled()
  })

  test('injects default policy, current path and no-store for views', () => {
    const request = createViewRequest({
      path: '/signed-out',
      search: '?lang=cy'
    })
    request.response.source.context = undefined
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    const result = applyCookieConsentToView(request, h)

    expect(request.response.source.context.cookiesPolicy).toEqual({
      confirmed: false,
      essential: true,
      analytics: false
    })
    expect(request.response.source.context.currentPath).toBe(
      '/signed-out?lang=cy'
    )
    expect(h.unstate).not.toHaveBeenCalled()
    expect(result).toBe(h.continue)
  })

  test('does not expire GA cookies on first visit', () => {
    const request = createViewRequest({
      state: { _ga: 'GA1.1.1', _gid: 'GA1.1.2' }
    })
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    applyCookieConsentToView(request, h)

    expect(h.unstate).not.toHaveBeenCalled()
  })

  test('expires GA cookies when analytics has been rejected', () => {
    const request = createViewRequest({
      state: {
        'waste-obligations-cookie-policy': {
          confirmed: true,
          essential: true,
          analytics: false
        },
        _ga: 'GA1.1.1'
      }
    })
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    applyCookieConsentToView(request, h)

    expect(h.unstate).toHaveBeenCalledWith('_ga')
  })

  test('does not expire GA cookies when analytics has been accepted', () => {
    const request = createViewRequest({
      state: {
        'waste-obligations-cookie-policy': {
          confirmed: true,
          essential: true,
          analytics: true
        },
        _ga: 'GA1.1.1'
      }
    })
    const h = { continue: Symbol('continue'), state: vi.fn(), unstate: vi.fn() }

    applyCookieConsentToView(request, h)

    expect(h.unstate).not.toHaveBeenCalled()
  })
})
