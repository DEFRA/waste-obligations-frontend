import { config } from '#/config/config.js'

/**
 * Builds a clock for date-dependent UI logic, such as the December waste
 * flash. With an override, the clock starts at that timestamp and then
 * advances in step with real time (as epr-packaging-frontend's
 * `StartupUtcTimestampOverride`). Only code that calls the clock sees the
 * shifted time; sign-in, sessions and token expiry keep the real clock.
 *
 * The override is honoured only when `environment` is `local`, so it can never
 * take effect in a CDP environment.
 *
 * @param {object} options
 * @param {string|null} [options.override] RFC 3339 timestamp, e.g. `2026-12-15T12:00:00Z`
 * @param {string} [options.environment] CDP environment name
 * @param {() => number} [options.realNow] real clock in epoch ms
 * @returns {{ now: () => Date, overridden: boolean }}
 */
export function createClock({
  override = null,
  environment = 'local',
  realNow = () => Date.now()
} = {}) {
  if (!override || environment !== 'local') {
    return { now: () => new Date(realNow()), overridden: false }
  }

  const startMs = Date.parse(override)
  if (Number.isNaN(startMs)) {
    throw new TypeError(
      `STARTUP_UTC_TIMESTAMP_OVERRIDE must be an RFC 3339 timestamp, got ${JSON.stringify(override)}`
    )
  }

  const offsetMs = startMs - realNow()
  return { now: () => new Date(realNow() + offsetMs), overridden: true }
}

const clock = createClock({
  override: config.get('startupUtcTimestampOverride'),
  environment: config.get('cdpEnvironment')
})

/**
 * The current time for date-dependent UI logic.
 *
 * @returns {Date}
 */
export const now = clock.now

export const isClockOverridden = clock.overridden
