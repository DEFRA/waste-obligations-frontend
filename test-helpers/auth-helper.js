/**
 * @param {import('@hapi/hapi').ResponseObject} response
 * @returns {{ cookie?: string }}
 */
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

/**
 * Establishes an authenticated yar session via the mock B2C sign-in route.
 *
 * @param {import('@hapi/hapi').Server} server
 * @returns {Promise<{ cookie?: string }>}
 */
export async function authenticate(server) {
  const response = await server.inject({
    method: 'GET',
    url: '/signin-oidc'
  })

  return cookieHeadersFromResponse(response)
}

/**
 * @param {import('@hapi/hapi').Server} server
 * @param {import('@hapi/hapi').ServerInjectOptions} options
 * @param {{ cookie?: string }} authHeaders
 */
export function injectAuthed(server, options, authHeaders) {
  return server.inject({
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers
    }
  })
}
