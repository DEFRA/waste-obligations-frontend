import Boom from '@hapi/boom'

const MAX_HOSTNAME_LENGTH = 253
const MAX_AUTHORITY_LENGTH = 259 // Hostname plus colon and five-digit port.
const INVALID_HOST_MESSAGE = 'Invalid authentication host'

const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

export function validateAuthenticationHost(authority, allowedHosts) {
  if (
    typeof authority !== 'string' ||
    authority.length > MAX_AUTHORITY_LENGTH ||
    !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(authority)
  ) {
    throw Boom.badRequest(INVALID_HOST_MESSAGE)
  }

  let hostname
  try {
    // URL parsing checks port bounds; the syntax check above excludes URL
    // components, escapes, whitespace and comma-separated forwarding chains.
    const url = new URL(`http://${authority}`)
    hostname = url.hostname
    if (url.port === '0' || hostname.length > MAX_HOSTNAME_LENGTH) {
      throw new Error('Invalid authority')
    }
  } catch {
    throw Boom.badRequest(INVALID_HOST_MESSAGE)
  }

  const allowed = allowedHosts.some((entry) => {
    const rule = entry.trim().toLowerCase()
    return rule.startsWith('.') ? hostname.endsWith(rule) : hostname === rule
  })
  if (
    !hostname.split('.').every((label) => HOST_LABEL.test(label)) ||
    !allowed
  ) {
    throw Boom.badRequest(INVALID_HOST_MESSAGE)
  }

  return authority.toLowerCase()
}
