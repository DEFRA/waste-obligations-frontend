import {
  createClock,
  isClockOverridden,
  logClockOverride,
  now
} from './clock.js'

const REAL_START_MS = Date.parse('2026-10-09T09:00:00Z')

function fakeRealClock() {
  let currentMs = REAL_START_MS
  return {
    realNow: () => currentMs,
    advance: (ms) => {
      currentMs += ms
    }
  }
}

describe('createClock', () => {
  test('uses the real clock without an override', () => {
    const real = fakeRealClock()
    const clock = createClock({ realNow: real.realNow })

    expect(clock.overridden).toBe(false)
    expect(clock.now().getTime()).toBe(REAL_START_MS)
  })

  test('starts at the override and then advances with real time', () => {
    const real = fakeRealClock()
    const clock = createClock({
      override: '2026-12-15T12:00:00Z',
      environment: 'local',
      realNow: real.realNow
    })

    expect(clock.overridden).toBe(true)
    expect(clock.now().toISOString()).toBe('2026-12-15T12:00:00.000Z')

    real.advance(90_000)

    expect(clock.now().toISOString()).toBe('2026-12-15T12:01:30.000Z')
  })

  test.each(['dev', 'test', 'perf-test', 'ext-test', 'prod'])(
    'ignores the override in the %s CDP environment',
    (environment) => {
      const real = fakeRealClock()
      const clock = createClock({
        override: '2026-12-15T12:00:00Z',
        environment,
        realNow: real.realNow
      })

      expect(clock.overridden).toBe(false)
      expect(clock.now().getTime()).toBe(REAL_START_MS)
    }
  )

  test('rejects an override that is not a timestamp', () => {
    expect(() =>
      createClock({ override: 'not-a-date', environment: 'local' })
    ).toThrow(/STARTUP_UTC_TIMESTAMP_OVERRIDE must be an RFC 3339 timestamp/)
  })
})

describe('now', () => {
  test('follows the real clock when no override is configured', () => {
    expect(isClockOverridden).toBe(false)
    expect(Math.abs(now().getTime() - Date.now())).toBeLessThan(1000)
  })
})

describe('logClockOverride', () => {
  test('logs nothing when no override is configured', () => {
    const logger = { warn: vi.fn() }

    logClockOverride(logger)

    expect(logger.warn).not.toHaveBeenCalled()
  })

  test('warns with the shifted time when an override is configured', async () => {
    vi.resetModules()
    vi.stubEnv('STARTUP_UTC_TIMESTAMP_OVERRIDE', '2026-12-15T12:00:00Z')
    vi.stubEnv('ENVIRONMENT', 'local')
    const clock = await import('./clock.js')
    const logger = { warn: vi.fn() }

    clock.logClockOverride(logger)

    expect(clock.isClockOverridden).toBe(true)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /^STARTUP_UTC_TIMESTAMP_OVERRIDE is set: date-dependent UI logic is running at 2026-12-15T12:0/
      )
    )

    vi.unstubAllEnvs()
    vi.resetModules()
  })
})
