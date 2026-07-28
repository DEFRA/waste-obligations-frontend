/**
 * Azure AD B2C OpenID Connect helpers (authority URL and end-session / logout).
 */

import { paths } from '#/config/paths.js'
import {
  getForwardedPrefix,
  withForwardedPrefix
} from '#/server/common/helpers/proxy/forwarded-prefix.js'

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

function requestProtocol(request) {
  const forwardedProto = firstForwarded(request.headers['x-forwarded-proto'])

  if (forwardedProto === 'https' || forwardedProto === 'http') {
    return forwardedProto
  }

  return request.server.info.protocol === 'https' ? 'https' : 'http'
}

function requestHost(request) {
  return (
    firstForwarded(request.headers['x-forwarded-host']) ||
    request.headers.host ||
    request.info.host
  )
}

function requestOrigin(request) {
  return `${requestProtocol(request)}://${requestHost(request)}`
}

function isRequestHttps(request) {
  return requestProtocol(request) === 'https'
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

function resolvePostLogoutFromRequestHost(path, request) {
  return `${requestOrigin(request)}${withForwardedPrefix(request, path)}`
}

function resolvePostLogoutPathInput(pathOrUrl) {
  return (pathOrUrl || paths.signedOut).trim() || paths.signedOut
}

function normalizePostLogoutPath(pathOrUrl) {
  const raw = resolvePostLogoutPathInput(pathOrUrl)
  return raw.startsWith('/') ? raw : `/${raw}`
}

export function resolvePostLogoutAbsoluteUri(request, pathOrUrl) {
  const raw = resolvePostLogoutPathInput(pathOrUrl)
  if (/^https?:\/\//i.test(raw)) {
    return resolveAbsolutePostLogoutUrl(raw, request)
  }

  const path = normalizePostLogoutPath(raw)
  return resolvePostLogoutFromRequestHost(path, request)
}

export function logAzureAdB2cAuthFailure(request, err) {
  const query = request.query ?? {}

  const hasBellStateCookie = Boolean(request.state?.[BELL_AZURE_AD_B2C_COOKIE])

  request.logger.warn(
    { err },
    `Azure AD B2C authentication failed: reason=${err?.message}, hasBellStateCookie=${hasBellStateCookie}, hasCode=${Boolean(query.code)}, hasState=${Boolean(query.state)}, b2cError=${query.error}, b2cErrorDescription=${query.error_description}, referer=${request.headers.referer}`
  )
}

export function bellRedirectLocation(request) {
  return `${requestOrigin(request)}${getForwardedPrefix(request)}`
}

export function buildB2cOAuthEndpoint(cfg, suffix) {
  if (cfg.instance && cfg.domain) {
    return `${cfg.instance}/${cfg.domain}/${cfg.userFlow}/${suffix}`
  }
  return `https://${cfg.tenantName}.b2clogin.com/${cfg.tenantName}.onmicrosoft.com/${cfg.userFlow}/${suffix}`
}
