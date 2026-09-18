import { config } from './config.js'

describe('config', () => {
  test('does not configure an EPR Packaging clear-session URL by default', () => {
    expect(config.get('eprPackaging.clearSessionUrl')).toBeNull()
  })

  test('leaves Google analytics IDs unset by default', () => {
    expect(config.get('googleAnalytics.googleTagManagerKey')).toBe('')
    expect(config.get('googleAnalytics.measurementId')).toBe('')
  })

  test('uses explicit, positive Redis I/O timeout defaults', () => {
    expect(config.get('redis')).toMatchObject({
      cacheTtlMs: 14400000,
      connectTimeoutMs: 10000,
      commandTimeoutMs: 5000,
      clusterSlotsRefreshTimeoutMs: 10000
    })
  })

  test('rejects non-positive Redis command timeout values', () => {
    const commandTimeoutMs = config.get('redis.commandTimeoutMs')
    config.set('redis.commandTimeoutMs', 0)

    expect(() => config.validate({ allowed: 'strict' })).toThrow(
      /redis\.commandTimeoutMs: must be a positive integer/
    )

    config.set('redis.commandTimeoutMs', commandTimeoutMs)
    config.validate({ allowed: 'strict' })
  })
})
