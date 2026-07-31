import {
  cookieHeadersFromResponse,
  injectAuthed
} from '#/test-helpers/auth-helper.js'
import { config } from '#/config/config.js'

const csrfCookieName = config.get('csrf.cookie.name')

function mergeCookieHeaders(...sources) {
  const cookieParts = []

  for (const source of sources) {
    if (!source?.cookie) {
      continue
    }

    cookieParts.push(...source.cookie.split('; '))
  }

  const seen = new Set()
  const unique = cookieParts.filter((part) => {
    const name = part.split('=')[0]

    if (seen.has(name)) {
      return false
    }

    seen.add(name)
    return true
  })

  return unique.length > 0 ? { cookie: unique.join('; ') } : {}
}

export function extractCrumbFromHtml(html) {
  const source = String(html)
  const match = source.match(
    new RegExp(`name="${csrfCookieName}"[^>]*value="([^"]+)"`)
  )

  if (!match?.[1]) {
    throw new Error('CSRF token not found in response HTML')
  }

  return match[1]
}

export async function injectAuthedPostForm(server, options, authHeaders) {
  const { url, payload, getUrl = url, headers: requestHeaders } = options
  const getResponse = await injectAuthed(
    server,
    { method: 'GET', url: getUrl },
    authHeaders
  )

  if (getResponse.statusCode >= 400) {
    throw new Error(
      `Failed to load form page (${getUrl}): ${getResponse.statusCode}`
    )
  }

  const headers = mergeCookieHeaders(
    authHeaders,
    cookieHeadersFromResponse(getResponse)
  )
  const csrfToken = extractCrumbFromHtml(getResponse.result)

  return server.inject({
    method: 'POST',
    url,
    payload: { ...payload, [csrfCookieName]: csrfToken },
    headers: {
      ...requestHeaders,
      ...headers
    }
  })
}
