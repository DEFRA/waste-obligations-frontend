import { config } from '#/config/config.js'

const navigationHistoryBySessionId = new Map()

function getSessionId(request) {
  const sessionName = config.get('session.cache.name')
  const sessionState = request.state?.[sessionName]

  if (sessionState?.id) {
    return sessionState.id
  }

  try {
    return request.yar?.id ?? null
  } catch {
    return null
  }
}

export function getStoredNavigationPreviousUrl(request) {
  const sessionId = getSessionId(request)

  if (!sessionId) {
    return null
  }

  const previous = navigationHistoryBySessionId.get(sessionId)

  if (typeof previous === 'string' && previous.startsWith('/')) {
    return previous
  }

  return null
}

export function setStoredNavigationPreviousUrl(request, path) {
  const sessionId = getSessionId(request)

  if (!sessionId || typeof path !== 'string' || !path.startsWith('/')) {
    return
  }

  navigationHistoryBySessionId.set(sessionId, path)
}

export function clearNavigationHistoryStore() {
  navigationHistoryBySessionId.clear()
}
