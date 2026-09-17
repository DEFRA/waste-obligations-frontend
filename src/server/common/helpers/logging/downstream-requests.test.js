import { channel } from 'node:diagnostics_channel'
import { vi } from 'vitest'

const configGet = vi.hoisted(() => vi.fn())
vi.mock('#/config/config.js', () => ({ config: { get: configGet } }))

import { logDownstreamRequests } from './downstream-requests.js'

describe('downstream request logging', () => {
  let logger
  let stop
  const request = {
    origin: 'https://account.example',
    path: '/api/organisations/org-123?email=private@example.com',
    method: 'GET',
    headers: 'Authorization: secret',
    body: 'private body'
  }
  const publish = (event, value) =>
    channel(`undici:request:${event}`).publish(value)

  beforeEach(() => {
    logger = { info: vi.fn(), warn: vi.fn() }
    stop = logDownstreamRequests(logger)
  })

  afterEach(() => {
    stop()
    vi.restoreAllMocks()
  })

  test('logs each attempt with a distinct ID and only safe request fields', () => {
    publish('create', { request })
    publish('create', { request: { ...request } })

    const [first, second] = logger.info.mock.calls.map(([message]) => message)
    expect(first).toMatch(
      /^Downstream request initiated: downstreamRequestId=[\da-f-]+, method=GET, origin=https:\/\/account.example, path=\/api\/organisations\/org-123$/
    )
    expect(first).not.toBe(second)
    expect(JSON.stringify(logger.info.mock.calls)).not.toMatch(/private|secret/)
  })

  test.each([200, 404, 503])(
    'logs response status %s and elapsed time',
    (statusCode) => {
      const now = vi.spyOn(performance, 'now').mockReturnValue(100)
      publish('create', { request })
      now.mockReturnValue(142)
      publish('headers', { request, response: { statusCode } })

      expect(logger.info).toHaveBeenLastCalledWith(
        `Downstream response received: ${logger.info.mock.calls[0][0].split(': ').slice(1).join(': ')}, statusCode=${statusCode}, durationMs=42`
      )
    }
  )

  test.each([false, true])('logs failures with production=%s', (production) => {
    configGet.mockReturnValue(production)
    const error = new Error('private provider error')
    publish('create', { request })
    publish('error', { request, error })

    const details = logger.info.mock.calls[0][0].replace(
      'Downstream request initiated: ',
      ''
    )
    const message = expect.stringContaining(
      `Downstream request failed: ${details}, durationMs=`
    )

    if (production) {
      expect(logger.warn).toHaveBeenCalledWith(message)
      expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('private')
    } else {
      expect(logger.warn).toHaveBeenCalledWith({ err: error }, message)
    }
  })

  test('ignores requests that began before subscription', () => {
    publish('headers', { request: {}, response: { statusCode: 200 } })
    publish('error', { request: {}, error: new Error('failed') })
    expect(logger.info).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('unsubscribes all listeners', () => {
    publish('create', { request })
    stop()
    logger.info.mockClear()
    publish('create', { request })
    publish('headers', { request, response: { statusCode: 200 } })
    publish('error', { request, error: new Error('failed') })
    expect(logger.info).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })
})
