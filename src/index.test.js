import { describe, expect, test, vi } from 'vitest'

const { startServer, logger } = vi.hoisted(() => ({
  startServer: vi.fn().mockResolvedValue(undefined),
  logger: { info: vi.fn(), error: vi.fn() }
}))

vi.mock('#/server/common/helpers/start-server.js', () => ({
  startServer
}))

vi.mock('#/server/common/helpers/logging/logger.js', () => ({
  createLogger: vi.fn(() => logger)
}))

describe('index.js', () => {
  test('starts the server and handles unhandled rejections', async () => {
    await import('./index.js')

    expect(startServer).toHaveBeenCalledOnce()

    const rejection = new Error('boom')
    const handlers = process.listeners('unhandledRejection')

    expect(handlers.length).toBeGreaterThan(0)

    const previousExitCode = process.exitCode
    handlers.at(-1)(rejection)

    expect(logger.info).toHaveBeenCalledWith('Unhandled rejection')
    expect(logger.error).toHaveBeenCalledWith(rejection)
    expect(process.exitCode).toBe(1)

    process.exitCode = previousExitCode
  })
})
