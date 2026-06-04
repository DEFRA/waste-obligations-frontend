import { createServer } from '#/server/server.js'
import { createMockBackendAccountApiService } from '#/test-helpers/mock-backend-account-api.js'

export function cookieHeadersFromResponse(response) {
  const setCookie = response.headers['set-cookie']
  if (!setCookie) {
    return {}
  }

  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie]
  return {
    cookie: cookies.map((entry) => entry.split(';')[0]).join('; ')
  }
}

export async function stopTestServer(server) {
  await server.stop({ timeout: 0 })
}

export async function startTestServer() {
  const server = await createServer()
  await server.initialize()
  return server
}

export async function startAuthenticatedTestServer() {
  const server = await startTestServer()
  const authHeaders = await authenticate(server)
  return { server, authHeaders }
}

export async function authenticate(server) {
  server.app.backendAccountApi = createMockBackendAccountApiService()

  const response = await server.inject({
    method: 'GET',
    url: '/signin-oidc'
  })

  if (response.statusCode >= 400) {
    throw new Error(
      `Test sign-in failed with status ${response.statusCode}: ${response.result}`
    )
  }

  return cookieHeadersFromResponse(response)
}

export function injectAuthed(server, options, authHeaders) {
  return server.inject({
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers
    }
  })
}
