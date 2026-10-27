const DEFAULT_WIREMOCK_URL = 'http://localhost:9080'

// Resets one WireMock.Net scenario to its starting state. Direct and
// reverse-proxy projects share one WireMock, so a reject click-through must
// start from AwaitingAcceptance even after an earlier project has rejected it.
export async function resetWireMockScenario(request, scenario) {
  const baseUrl = process.env.INTEGRATION_WIREMOCK_URL ?? DEFAULT_WIREMOCK_URL
  const response = await request.post(
    `${baseUrl}/__admin/scenarios/${encodeURIComponent(scenario)}/reset`
  )

  if (response.ok() || response.status() === 404) {
    return
  }

  throw new Error(
    `WireMock scenario reset failed for ${scenario}: ${response.status()} ${await response.text()}`
  )
}
