import { AsyncLocalStorage } from 'node:async_hooks'

export const LOAD_TEST_SESSION_HEADER = 'x-epr-load-test-session'
const OUTBOUND_LOAD_TEST_SESSION_HEADER = 'X-EPR-Load-Test-Session'
const loadTestSessionPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9]+$/i

const asyncLocalStorage = new AsyncLocalStorage()

function getValidatedLoadTestRequestHeaders(request, { enabled } = {}) {
  if (!enabled) {
    return null
  }

  const sessionKey = request.headers?.[LOAD_TEST_SESSION_HEADER]

  if (
    typeof sessionKey !== 'string' ||
    !loadTestSessionPattern.test(sessionKey)
  ) {
    return null
  }

  return { [OUTBOUND_LOAD_TEST_SESSION_HEADER]: sessionKey }
}

function wrapCycle(request, cycle, store) {
  const requestCycle = request[cycle].bind(request)
  request[cycle] = () => asyncLocalStorage.run(store, requestCycle)
}

export function bindLoadTestRequestContext(request, options) {
  const store = new Map([
    ['headers', getValidatedLoadTestRequestHeaders(request, options)]
  ])

  wrapCycle(request, '_lifecycle', store)
  wrapCycle(request, '_postCycle', store)
}

export function getLoadTestRequestHeaders() {
  const headers = asyncLocalStorage.getStore()?.get('headers')

  return headers ? { ...headers } : null
}

export function isLoadTestRequest() {
  return getLoadTestRequestHeaders() !== null
}
