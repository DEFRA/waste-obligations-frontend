/**
 * Azure AD B2C OpenID Connect helpers (authority URL and end-session / logout).
 */

import { paths } from '#/config/paths.js'

/**
 * @param {string} [idToken]
 * @returns {object}
 */
export function decodeIdTokenProfile(idToken) {
  if (!idToken) {
    return {}
  }

  try {
    const payload = idToken.split('.')[1]

    if (!payload) {
      return {}
    }

    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return {}
  }
}

/** Bell registers the OAuth state cookie as `bell-${provider.name}`. */
export const BELL_AZURE_AD_B2C_COOKIE = 'bell-azure-ad-b2c'

/** Hapi auth strategy name for Azure AD B2C. */
export const AZURE_AD_B2C_AUTH_STRATEGY = 'azure-ad-b2c'

/**
 * Policy-scoped authority prefix used for B2C logout:
 * `{instance}/{domain}/{userFlow}` or `https://{tenant}.b2clogin.com/...`
 */
export function getB2cAuthorityPrefix(cfg) {
  if (!cfg) {
    return null
  }
  if (cfg.instance && cfg.domain && cfg.userFlow) {
    const inst = String(cfg.instance).replace(/\/$/, '')
    return `${inst}/${cfg.domain}/${cfg.userFlow}`
  }
  if (cfg.tenantName && cfg.userFlow) {
    return `https://${cfg.tenantName}.b2clogin.com/${cfg.tenantName}.onmicrosoft.com/${cfg.userFlow}`
  }
  return null
}

/**
 * @param {string} authorityPrefix - from {@link getB2cAuthorityPrefix}
 * @param {string} [postLogoutRedirectAbsoluteUrl] - optional `post_logout_redirect_uri`
 */
export function buildB2cLogoutUrl(
  authorityPrefix,
  postLogoutRedirectAbsoluteUrl
) {
  const base = `${authorityPrefix}/oauth2/v2.0/logout`
  if (!postLogoutRedirectAbsoluteUrl) {
    return base
  }
  const params = new URLSearchParams({
    post_logout_redirect_uri: postLogoutRedirectAbsoluteUrl
  })
  return `${base}?${params.toString()}`
}

function firstForwarded(value) {
  if (!value || typeof value !== 'string') {
    return undefined
  }
  return value.split(',')[0].trim()
}

function isRequestHttps(request) {
  const proto = firstForwarded(request.headers['x-forwarded-proto'])
  if (proto === 'https') {
    return true
  }
  return request.server.info.protocol === 'https'
}

function toHttpsIfNeeded(url, request) {
  if (isRequestHttps(request) && url.protocol === 'http:') {
    url.protocol = 'https:'
  }
  return url
}

function resolveAbsolutePostLogoutUrl(raw, request) {
  const url = toHttpsIfNeeded(new URL(raw), request)
  return url.href
}

function resolvePostLogoutFromRedirectUri(path, redirectUri, request) {
  const origin = toHttpsIfNeeded(new URL(redirectUri), request)
  return new URL(path, origin.origin).href
}

function resolvePostLogoutFromRequestHost(path, request) {
  const proto =
    firstForwarded(request.headers['x-forwarded-proto']) ||
    request.server.info.protocol
  const host =
    firstForwarded(request.headers['x-forwarded-host']) ||
    request.headers.host ||
    request.info.host
  const scheme = proto === 'https' ? 'https' : 'http'
  return `${scheme}://${host}${path}`
}

function resolvePostLogoutPathInput(pathOrUrl) {
  return (pathOrUrl || paths.signedOut).trim() || paths.signedOut
}

function normalizePostLogoutPath(pathOrUrl) {
  const raw = resolvePostLogoutPathInput(pathOrUrl)
  return raw.startsWith('/') ? raw : `/${raw}`
}

/**
 * Absolute URL for `post_logout_redirect_uri`, aligned with Bell redirect_uri base.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {string} pathOrUrl - path (e.g. signed-out route) or absolute URL
 * @param {object} azureConfig - `config.get('auth.azureAdB2c')`
 */
export function resolvePostLogoutAbsoluteUri(request, pathOrUrl, azureConfig) {
  const raw = resolvePostLogoutPathInput(pathOrUrl)
  if (/^https?:\/\//i.test(raw)) {
    return resolveAbsolutePostLogoutUrl(raw, request)
  }

  const path = normalizePostLogoutPath(raw)
  const redirectUri = azureConfig?.redirectUri || ''
  if (/^https?:\/\//i.test(redirectUri)) {
    return resolvePostLogoutFromRedirectUri(path, redirectUri, request)
  }

  return resolvePostLogoutFromRequestHost(path, request)
}

/**
 * Logs structured context when Bell / Azure AD B2C authentication fails (e.g. missing
 * OAuth state cookie after the IdP redirect).
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {Error} err
 */
export function logAzureAdB2cAuthFailure(request, err) {
  const query = request.query ?? {}

  const hasBellStateCookie = Boolean(request.state?.[BELL_AZURE_AD_B2C_COOKIE])

  request.logger.warn(
    {
      err,
      event: {
        action: 'b2c-auth-failure',
        category: 'authentication',
        outcome: 'failure',
        reason: err?.message
      },
      tenant: {
        message: `hasBellStateCookie=${hasBellStateCookie}, hasCode=${Boolean(query.code)}, hasState=${Boolean(query.state)}, b2cError=${query.error}, b2cErrorDescription=${query.error_description}, referer=${request.headers.referer}`
      }
    },
    'Azure AD B2C authentication failed'
  )
}

/**
 * Bell `location` must be the app origin (redirect_uri = location + request.path).
 *
 * @param {string} redirectUri
 * @param {import('@hapi/hapi').ServerOptions['tls']} tls
 * @param {{ host: string, port: number }} serverAddress
 */
export function bellRedirectOrigin(redirectUri, tls, serverAddress) {
  if (!redirectUri) {
    return undefined
  }
  if (/^https?:\/\//i.test(redirectUri)) {
    const u = new URL(redirectUri)
    if (tls && u.protocol === 'http:') {
      u.protocol = 'https:'
    }
    return u.origin
  }
  const scheme = tls ? 'https' : 'http'
  const host =
    serverAddress.host === '0.0.0.0' ? 'localhost' : serverAddress.host
  const base = `${scheme}://${host}:${serverAddress.port}`
  return new URL(redirectUri, base).origin
}

/**
 * Builds B2C OAuth endpoint URLs from instance/domain or tenant name config.
 *
 * @param {object} cfg - `config.get('auth.azureAdB2c')`
 * @param {string} suffix - path after user flow (e.g. `oauth2/v2.0/authorize`)
 */
export function buildB2cOAuthEndpoint(cfg, suffix) {
  if (cfg.instance && cfg.domain) {
    return `${cfg.instance}/${cfg.domain}/${cfg.userFlow}/${suffix}`
  }
  return `https://${cfg.tenantName}.b2clogin.com/${cfg.tenantName}.onmicrosoft.com/${cfg.userFlow}/${suffix}`
}
