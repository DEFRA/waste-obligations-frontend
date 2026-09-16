import { config } from './config.js'
import { DEFAULT_COOKIE_POLICY_TTL_MS } from './cookie-config.js'

describe('config', () => {
  test('does not configure an EPR Packaging clear-session URL by default', () => {
    expect(config.get('eprPackaging.clearSessionUrl')).toBeNull()
  })

  test('configures a one-year analytics consent cookie by default', () => {
    expect(config.get('cookiePolicy.name')).toBe(
      'waste-obligations-cookie-policy'
    )
    expect(config.get('cookiePolicy.ttl')).toBe(DEFAULT_COOKIE_POLICY_TTL_MS)
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
