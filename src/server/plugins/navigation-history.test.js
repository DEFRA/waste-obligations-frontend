import { describe, expect, test, vi } from 'vitest'

const resolveBackLinkHref = vi.fn(() => '/previous')
const recordNavigationHistory = vi.fn()

vi.mock('#/server/common/helpers/navigation/back-link.js', () => ({
  resolveBackLinkHref,
  recordNavigationHistory
}))

const { navigationHistory } = await import('./navigation-history.js')

describe('navigationHistory plugin', () => {
  test('resolves the back link before the handler and records history after', () => {
    const preHandlerExts = []
    const postHandlerExts = []
    const server = {
      ext(type, method) {
        if (type === 'onPreHandler') {
          preHandlerExts.push(method)
        }

        if (type === 'onPostHandler') {
          postHandlerExts.push(method)
        }
      }
    }

    navigationHistory.plugin.register(server)

    const request = { app: {} }
    const h = { continue: Symbol('continue') }

    expect(preHandlerExts).toHaveLength(1)
    expect(postHandlerExts).toHaveLength(1)

    const preResult = preHandlerExts[0](request, h)
    expect(resolveBackLinkHref).toHaveBeenCalledWith(request)
    expect(request.app.backLinkHref).toBe('/previous')
    expect(preResult).toBe(h.continue)

    const postResult = postHandlerExts[0](request, h)
    expect(recordNavigationHistory).toHaveBeenCalledWith(request)
    expect(postResult).toBe(h.continue)
  })
})
