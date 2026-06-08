import { afterEach, describe, expect, test, vi } from 'vitest'

describe('config', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  test('uses production defaults when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { config } = await import('./config.js')

    expect(config.get('log.format')).toBe('ecs')
    expect(config.get('log.redact')).toEqual([
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers'
    ])
    expect(config.get('isSecureContextEnabled')).toBe(true)
    expect(config.get('session.cache.engine')).toBe('redis')
  })

  test('uses non-production defaults when NODE_ENV is development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { config } = await import('./config.js')

    expect(config.get('log.format')).toBe('pino-pretty')
    expect(config.get('log.redact')).toEqual([])
    expect(config.get('isSecureContextEnabled')).toBe(false)
    expect(config.get('session.cache.engine')).toBe('memory')
  })
})
