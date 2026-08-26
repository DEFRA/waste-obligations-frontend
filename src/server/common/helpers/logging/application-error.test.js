import { vi } from 'vitest'

const configGet = vi.hoisted(() => vi.fn())

vi.mock('#/config/config.js', () => ({
  config: { get: configGet }
}))

import { logApplicationError } from './application-error.js'

describe('logApplicationError', () => {
  const error = new Error('Upstream response included a@example.com')
  const message = 'Unable to complete the request'

  beforeEach(() => {
    configGet.mockReset()
  })

  test('logs the error locally for diagnosis', () => {
    const logger = { warn: vi.fn() }
    configGet.mockReturnValue(false)

    logApplicationError(logger, 'warn', error, message)

    expect(logger.warn).toHaveBeenCalledWith({ err: error }, message)
  })

  test('does not log raw errors in production', () => {
    const logger = { error: vi.fn() }
    configGet.mockReturnValue(true)

    logApplicationError(logger, 'error', error, message)

    expect(logger.error).toHaveBeenCalledWith(message)
  })
})
