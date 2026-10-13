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
