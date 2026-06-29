/**
 * Azure AD B2C OpenID Connect helpers (authority URL and end-session / logout).
 */

import { paths } from '#/config/paths.js'

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

export const BELL_AZURE_AD_B2C_COOKIE = 'bell-azure-ad-b2c'

export const AZURE_AD_B2C_AUTH_STRATEGY = 'azure-ad-b2c'

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

export function shouldApplyPostLogoutRedirectUri(
  request,
  postLogoutAbsoluteUri
) {
  if (!postLogoutAbsoluteUri) {
    return false
  }

  const referer = request.headers.referer
  if (!referer) {
    return true
  }

  try {
    const refererOrigin = new URL(referer).origin
    const postLogoutOrigin = new URL(postLogoutAbsoluteUri).origin
    return refererOrigin !== postLogoutOrigin
  } catch {
    return true
  }
}

export function logAzureAdB2cAuthFailure(request, err) {
  const query = request.query ?? {}

  const hasBellStateCookie = Boolean(request.state?.[BELL_AZURE_AD_B2C_COOKIE])

  request.logger.warn(
    { err },
    `Azure AD B2C authentication failed: reason=${err?.message}, hasBellStateCookie=${hasBellStateCookie}, hasCode=${Boolean(query.code)}, hasState=${Boolean(query.state)}, b2cError=${query.error}, b2cErrorDescription=${query.error_description}, referer=${request.headers.referer}`
  )
}

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

export function buildB2cOAuthEndpoint(cfg, suffix) {
  if (cfg.instance && cfg.domain) {
    return `${cfg.instance}/${cfg.domain}/${cfg.userFlow}/${suffix}`
  }
  return `https://${cfg.tenantName}.b2clogin.com/${cfg.tenantName}.onmicrosoft.com/${cfg.userFlow}/${suffix}`
}
