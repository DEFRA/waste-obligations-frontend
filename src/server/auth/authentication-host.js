import Boom from '@hapi/boom'

const HOST_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i

export function validateAuthenticationHost(authority, allowedHosts) {
  if (
    typeof authority !== 'string' ||
    authority.length > 259 ||
    !/^[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(authority)
  ) {
    throw Boom.badRequest('Invalid authentication host')
  }

  let hostname
  try {
    // URL parsing checks port bounds; the syntax check above excludes URL
    // components, escapes, whitespace and comma-separated forwarding chains.
    const url = new URL(`http://${authority}`)
    hostname = url.hostname
    if (url.port === '0' || hostname.length > 253) {
      throw new Error('Invalid authority')
    }
  } catch {
    throw Boom.badRequest('Invalid authentication host')
  }

  const allowed = allowedHosts.some((entry) => {
    const rule = entry.trim().toLowerCase()
    return rule.startsWith('.') ? hostname.endsWith(rule) : hostname === rule
  })
  if (
    !hostname.split('.').every((label) => HOST_LABEL.test(label)) ||
    !allowed
  ) {
    throw Boom.badRequest('Invalid authentication host')
  }

  return authority.toLowerCase()
}
