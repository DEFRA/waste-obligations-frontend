const DEFAULT_DIRECT_BASE_URL = process.env.CI
  ? 'http://localhost:3000'
  : 'https://localhost:3000'

export function integrationDirectBaseUrl() {
  return (
    process.env.INTEGRATION_DIRECT_BASE_URL ??
    process.env.INTEGRATION_BASE_URL ??
    DEFAULT_DIRECT_BASE_URL
  )
}

export function integrationProxyBaseUrl() {
  return process.env.INTEGRATION_PROXY_BASE_URL
}

export function integrationServiceBaseUrl(baseUrl) {
  return `${baseUrl.replace(/\/+$/, '')}/`
}

/**
 * `default` runs the journeys against the 15 December 2026 clock. `post-deadline`
 * runs the `*.post-deadline.spec.js` journeys against a clock after the
 * 31 January 2027 submission deadline (see `integration:ci:post-deadline`).
 */
export function integrationClockProfile() {
  return process.env.INTEGRATION_CLOCK === 'post-deadline'
    ? 'post-deadline'
    : 'default'
}
