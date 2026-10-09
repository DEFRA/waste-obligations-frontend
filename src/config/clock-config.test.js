import { CDP_ENVIRONMENTS, createClockConfig } from './clock-config.js'

describe('Clock configuration', () => {
  test('reads the CDP environment from ENVIRONMENT, defaulting to local', () => {
    const { cdpEnvironment } = createClockConfig()

    expect(cdpEnvironment.default).toBe('local')
    expect(cdpEnvironment.env).toBe('ENVIRONMENT')
    expect(cdpEnvironment.format).toBe(CDP_ENVIRONMENTS)
    expect(CDP_ENVIRONMENTS).toContain('prod')
  })

  test('leaves the startup timestamp override unset by default', () => {
    const { startupUtcTimestampOverride } = createClockConfig()

    expect(startupUtcTimestampOverride.default).toBeNull()
    expect(startupUtcTimestampOverride.nullable).toBe(true)
    expect(startupUtcTimestampOverride.env).toBe(
      'STARTUP_UTC_TIMESTAMP_OVERRIDE'
    )
  })
})
