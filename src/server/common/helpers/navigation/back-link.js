import { config } from '#/config/config.js'
import { isSafeReturnPath } from '#/config/paths.js'
import { isPublicPath } from '#/server/auth/public-paths.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  getStoredNavigationPreviousUrl,
  setStoredNavigationPreviousUrl
} from './navigation-history-store.js'

export function getCurrentRequestPath(request) {
  const path = request?.path ?? '/'
  const search = request?.url?.search ?? ''

  return `${path}${search}`
}

function getNavigationPreviousUrl(request) {
  try {
    return getStoredNavigationPreviousUrl(request)
  } catch {
    // Session may be unavailable during error handling
  }

  return null
}

function getRefererUrl(request) {
  const raw = request?.headers?.referer ?? request?.headers?.referrer

  if (!raw) {
    return null
  }

  try {
    return new URL(raw)
  } catch {
    return null
  }
}

function isSameHost(refererUrl, request) {
  return refererUrl.host === request?.info?.host
}

function isSafeInternalBackPath(pathWithQuery) {
  const [pathname] = pathWithQuery.split('?')

  return isSafeReturnPath(pathname)
}

function isAllowedExternalBackUrl(candidateUrl) {
  const allowedUrls = [
    config.get('eprPackaging.homeUrl'),
    config.get('eprPackaging.manageYourRecyclingObligationsUrl'),
    config.get('eprPackaging.manageAccountUrl')
  ].filter(Boolean)

  return allowedUrls.some((base) => {
    try {
      const baseUrl = new URL(base)
      const normalizedBase = baseUrl.href.replace(/\/$/, '')

      return (
        candidateUrl.origin === baseUrl.origin &&
        candidateUrl.href.startsWith(normalizedBase)
      )
    } catch {
      return false
    }
  })
}

function resolveRefererBackLink(request, currentPath) {
  const referer = getRefererUrl(request)

  if (!referer) {
    return null
  }

  if (isSameHost(referer, request)) {
    const path = `${referer.pathname}${referer.search}`

    if (path !== currentPath && isSafeInternalBackPath(path)) {
      return path
    }
  }

  if (isAllowedExternalBackUrl(referer)) {
    return referer.href
  }

  return null
}

export function resolveBackLinkHref(
  request,
  { fallbackUrl = config.get('eprPackaging.homeUrl') } = {}
) {
  const currentPath = getCurrentRequestPath(request)
  const previousPath = getNavigationPreviousUrl(request)

  if (
    previousPath &&
    previousPath !== currentPath &&
    isSafeInternalBackPath(previousPath)
  ) {
    return previousPath
  }

  const refererBackLink = resolveRefererBackLink(request, currentPath)

  if (refererBackLink) {
    return refererBackLink
  }

  return fallbackUrl
}

export function shouldRecordNavigationHistory(request, response) {
  if (request.method !== 'get') {
    return false
  }

  if (response.statusCode >= statusCodes.badRequest) {
    return false
  }

  if (isPublicPath(request.path)) {
    return false
  }

  return isSafeInternalBackPath(getCurrentRequestPath(request))
}

export function recordNavigationHistory(request) {
  if (!shouldRecordNavigationHistory(request, request.response)) {
    return
  }

  try {
    setStoredNavigationPreviousUrl(request, getCurrentRequestPath(request))
  } catch {
    // Session may be unavailable during error handling
  }
}
