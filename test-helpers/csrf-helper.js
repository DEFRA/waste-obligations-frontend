import {
  cookieHeadersFromResponse,
  injectAuthed
} from '#/test-helpers/auth-helper.js'

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
  const match = String(html).match(/name="crumb"\s+value="([^"]+)"/)

  if (!match) {
    throw new Error('CSRF crumb not found in response HTML')
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
  const crumb = extractCrumbFromHtml(getResponse.result)

  return server.inject({
    method: 'POST',
    url,
    payload: { ...payload, crumb },
    headers: {
      ...requestHeaders,
      ...headers
    }
  })
}
