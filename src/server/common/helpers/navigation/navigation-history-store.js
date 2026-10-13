const NAVIGATION_HISTORY_KEY = 'navigationHistory'
const BLOCKED_NAVIGATION_PATHS_KEY = 'navigationBlockedPaths'
const MAX_NAVIGATION_HISTORY = 20

function isAbsoluteUrl(path) {
  return (
    typeof path === 'string' &&
    (path.startsWith('http://') || path.startsWith('https://'))
  )
}

function isValidHistoryEntry(path) {
  if (typeof path !== 'string' || path.length === 0) {
    return false
  }

  if (path.startsWith('/')) {
    return !path.startsWith('//')
  }

  if (!isAbsoluteUrl(path)) {
    return false
  }

  try {
    return Boolean(new URL(path))
  } catch {
    return false
  }
}

function readHistory(request) {
  const history = request.yar?.get(NAVIGATION_HISTORY_KEY)

  if (!Array.isArray(history)) {
    return []
  }

  return history.filter((path) => isValidHistoryEntry(path))
}

function writeHistory(request, history) {
  request.yar.set(
    NAVIGATION_HISTORY_KEY,
    history.slice(-MAX_NAVIGATION_HISTORY)
  )
}

function pathWithoutQuery(path) {
  return path.split('?')[0]
}

function readBlockedPathnames(request) {
  const blocked = request.yar?.get(BLOCKED_NAVIGATION_PATHS_KEY)

  if (!Array.isArray(blocked)) {
    return []
  }

  return blocked.filter(
    (path) => typeof path === 'string' && path.startsWith('/')
  )
}

function writeBlockedPathnames(request, pathnames) {
  const uniquePathnames = [...new Set(pathnames)]

  if (uniquePathnames.length === 0) {
    request.yar?.clear?.(BLOCKED_NAVIGATION_PATHS_KEY)
    return
  }

  request.yar.set(BLOCKED_NAVIGATION_PATHS_KEY, uniquePathnames)
}

function blockNavigationPath(request, pathname) {
  const blocked = readBlockedPathnames(request)

  if (blocked.includes(pathname)) {
    return
  }

  writeBlockedPathnames(request, [...blocked, pathname])
}

function unblockNavigationPath(request, pathname) {
  const blocked = readBlockedPathnames(request)
  const nextBlocked = blocked.filter((entry) => entry !== pathname)

  if (nextBlocked.length === blocked.length) {
    return
  }

  writeBlockedPathnames(request, nextBlocked)
}

export function isBlockedNavigationPath(request, path) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    return false
  }

  return readBlockedPathnames(request).includes(pathWithoutQuery(path))
}

function findHistoryIndex(history, path) {
  if (typeof path !== 'string' || isAbsoluteUrl(path)) {
    return -1
  }

  const exactIndex = history.lastIndexOf(path)

  if (exactIndex >= 0) {
    return exactIndex
  }

  const pathname = pathWithoutQuery(path)

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index]

    if (!isAbsoluteUrl(entry) && pathWithoutQuery(entry) === pathname) {
      return index
    }
  }

  return -1
}

function isSameNavigationPath(left, right) {
  if (isAbsoluteUrl(left) || isAbsoluteUrl(right)) {
    return left === right
  }

  return left === right || pathWithoutQuery(left) === pathWithoutQuery(right)
}

/**
 * @returns {{ previousUrl: string | null, currentInHistory: boolean }}
 */
export function getNavigationHistoryState(request, { excludePath } = {}) {
  const history = readHistory(request)
  const currentIndex = findHistoryIndex(history, excludePath)
  const startIndex = currentIndex >= 0 ? currentIndex - 1 : history.length - 1

  for (let index = startIndex; index >= 0; index -= 1) {
    const entry = history[index]
    const isCurrentPage =
      currentIndex < 0 &&
      typeof excludePath === 'string' &&
      isSameNavigationPath(entry, excludePath)

    if (!isCurrentPage && !isBlockedNavigationPath(request, entry)) {
      return {
        previousUrl: entry,
        currentInHistory: currentIndex >= 0
      }
    }
  }

  return {
    previousUrl: null,
    currentInHistory: currentIndex >= 0
  }
}

/**
 * Push a path onto the stack. Revisiting an earlier path truncates forward
 * entries (browser-like back). Optionally seeds an entry referer when empty.
 */
export function setStoredNavigationPreviousUrl(
  request,
  path,
  { entryReferer } = {}
) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    return
  }

  unblockNavigationPath(request, pathWithoutQuery(path))

  let history = readHistory(request)

  if (
    history.length === 0 &&
    isValidHistoryEntry(entryReferer) &&
    entryReferer !== path
  ) {
    history = [entryReferer]
  }

  const existingIndex = findHistoryIndex(history, path)

  if (existingIndex >= 0) {
    writeHistory(request, [...history.slice(0, existingIndex), path])
    return
  }

  writeHistory(request, [...history, path])
}

export function removeStoredNavigationPath(request, path) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    return
  }

  const pathname = pathWithoutQuery(path)
  blockNavigationPath(request, pathname)

  const history = readHistory(request)
  const nextHistory = history.filter((entry) => {
    if (isAbsoluteUrl(entry)) {
      return true
    }

    return pathWithoutQuery(entry) !== pathname
  })

  if (nextHistory.length === history.length) {
    return
  }

  writeHistory(request, nextHistory)
}

export function clearNavigationHistory(request) {
  request.yar?.clear?.(NAVIGATION_HISTORY_KEY)
  request.yar?.clear?.(BLOCKED_NAVIGATION_PATHS_KEY)
}
