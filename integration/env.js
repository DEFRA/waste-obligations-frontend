export function integrationBaseUrl() {
  return (
    process.env.INTEGRATION_BASE_URL ??
    (process.env.CI ? 'http://localhost:3000' : 'https://localhost:3000')
  )
}
