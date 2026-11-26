import { config } from '#/config/config.js'
import { isSafeReturnPath } from '#/config/paths.js'
import { isPublicPath } from '#/server/auth/public-paths.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  getForwardedPrefix,
  withForwardedPrefix
} from '#/server/common/helpers/proxy/forwarded-prefix.js'
import {
  getNavigationHistoryState,
  isBlockedNavigationPath,
  removeStoredNavigationPath,
  setStoredNavigationPreviousUrl
} from './navigation-history-store.js'

export function getCurrentRequestPath(request) {
  const path = request?.path ?? '/'
  const search = request?.url?.search ?? ''

  return `${path}${search}`
}

function getNavigationHistoryStateSafe(request, currentPath) {
  try {
    return getNavigationHistoryState(request, {
      excludePath: currentPath
    })
  } catch {
    // Session may be unavailable during error handling
  }

  return {
    previousUrl: null,
    currentInHistory: false
  }
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

function isAbsoluteUrl(path) {
  return (
    typeof path === 'string' &&
    (path.startsWith('http://') || path.startsWith('https://'))
  )
}

function removeForwardedPrefix(request, path) {
  const prefix = getForwardedPrefix(request)

  if (!prefix || (path !== prefix && !path.startsWith(`${prefix}/`))) {
    return path
  }

  return path.slice(prefix.length) || '/'
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
    const path = removeForwardedPrefix(
      request,
      `${referer.pathname}${referer.search}`
    )

    if (
      path !== currentPath &&
      isSafeInternalBackPath(path) &&
      !isBlockedNavigationPath(request, path)
    ) {
      return path
    }

    return null
  }

  if (isAllowedExternalBackUrl(referer)) {
    return referer.href
  }

  return null
}

function formatBackLinkHref(request, pathOrUrl) {
  if (isAbsoluteUrl(pathOrUrl)) {
    try {
      if (isAllowedExternalBackUrl(new URL(pathOrUrl))) {
        return pathOrUrl
      }
    } catch {
      return null
    }

    return null
  }

  if (isSafeInternalBackPath(pathOrUrl)) {
    return withForwardedPrefix(request, pathOrUrl)
  }

  return null
}

export function resolveBackLinkHref(
  request,
  { fallbackUrl = config.get('eprPackaging.homeUrl') } = {}
) {
  const currentPath = getCurrentRequestPath(request)
  const { previousUrl, currentInHistory } = getNavigationHistoryStateSafe(
    request,
    currentPath
  )

  const historyBackLink = previousUrl
    ? formatBackLinkHref(request, previousUrl)
    : null

  if (historyBackLink) {
    return historyBackLink
  }

  // Once the current page is in the stack, trust the stack only. Falling back
  // to same-host Referer recreates an A↔B loop after the user clicks Back.
  if (!currentInHistory) {
    const refererBackLink = resolveRefererBackLink(request, currentPath)

    if (refererBackLink) {
      return formatBackLinkHref(request, refererBackLink) ?? refererBackLink
    }
  }

  return withForwardedPrefix(request, fallbackUrl)
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

function isSuccessfulFormSubmitRedirect(request, response) {
  if (request.method !== 'post') {
    return false
  }

  const statusCode = response?.statusCode

  return (
    statusCode >= statusCodes.multipleChoices &&
    statusCode < statusCodes.badRequest
  )
}

export function recordNavigationHistory(request) {
  try {
    if (isSuccessfulFormSubmitRedirect(request, request.response)) {
      removeStoredNavigationPath(request, getCurrentRequestPath(request))

      return
    }

    if (!shouldRecordNavigationHistory(request, request.response)) {
      return
    }

    const currentPath = getCurrentRequestPath(request)

    setStoredNavigationPreviousUrl(request, currentPath, {
      entryReferer: resolveRefererBackLink(request, currentPath)
    })
  } catch {
    // Session may be unavailable during error handling
  }
}
