const REQUEST_TIMEOUT_STATUS_CODE = 408
const TOO_MANY_REQUESTS_STATUS_CODE = 429
const SERVER_ERROR_MIN_STATUS_CODE = 500
const SERVER_ERROR_MAX_STATUS_CODE = 599
const RETRYABLE_STATUS_CODES = new Set([
  REQUEST_TIMEOUT_STATUS_CODE,
  TOO_MANY_REQUESTS_STATUS_CODE
])

// Align with the standard resilience pipeline used by waste-obligations.
export const DEFAULT_REQUEST_RESILIENCE = Object.freeze({
  totalTimeoutMs: 30000,
  attemptTimeoutMs: 10000,
  maxRetryAttempts: 3,
  retryDelayMs: 2000
})

function isRetryableResponse(response) {
  return (
    RETRYABLE_STATUS_CODES.has(response.status) ||
    isServerErrorStatus(response.status)
  )
}

function isServerErrorStatus(status) {
  return (
    status >= SERVER_ERROR_MIN_STATUS_CODE &&
    status <= SERVER_ERROR_MAX_STATUS_CODE
  )
}

function retryAfterMs(response, now) {
  const retryAfter = response.headers?.get?.('retry-after')
  if (!retryAfter) {
    return null
  }

  const seconds = Number(retryAfter)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const retryAt = Date.parse(retryAfter)
  return Number.isNaN(retryAt) ? null : Math.max(0, retryAt - now())
}

function retryDelayMs(retryAttempt, options, random) {
  const exponentialDelay = options.retryDelayMs * 2 ** retryAttempt

  return Math.round(exponentialDelay * (1 + random()))
}

function waitFor(delayMs, signal) {
  if (delayMs <= 0) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, delayMs)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true }
    )
  })
}

async function discardResponse(response) {
  try {
    await response.body?.cancel?.()
  } catch {
    // The response is being retried, so a failed best-effort cancellation is safe to ignore.
  }
}

function remainingMs(options, startedAt, now) {
  return options.totalTimeoutMs - (now() - startedAt)
}

function totalTimeoutError(totalSignal) {
  return totalSignal.reason ?? new Error('Downstream request timed out')
}

function hasRequestTimedOut(availableMs, totalSignal) {
  return availableMs <= 0 || totalSignal.aborted
}

function canRetryAfterError({
  retry,
  retryAttempt,
  options,
  totalSignal,
  externalSignal
}) {
  return (
    retry &&
    retryAttempt < options.maxRetryAttempts &&
    !totalSignal.aborted &&
    !externalSignal?.aborted
  )
}

function canRetryResponse({ retry, response, retryAttempt, options }) {
  return (
    retry &&
    isRetryableResponse(response) &&
    retryAttempt < options.maxRetryAttempts
  )
}

function hasTimeForDelay(delayMs, options, startedAt, now) {
  return delayMs < remainingMs(options, startedAt, now)
}

export async function fetchWithResilience({
  fetchImpl,
  url,
  init = {},
  retry = false,
  resilience = DEFAULT_REQUEST_RESILIENCE,
  random = Math.random,
  now = Date.now
}) {
  const options = { ...DEFAULT_REQUEST_RESILIENCE, ...resilience }
  const startedAt = now()
  const totalSignal = AbortSignal.timeout(options.totalTimeoutMs)
  const externalSignal = init.signal

  for (let retryAttempt = 0; ; retryAttempt += 1) {
    const availableMs = remainingMs(options, startedAt, now)
    if (hasRequestTimedOut(availableMs, totalSignal)) {
      throw totalTimeoutError(totalSignal)
    }

    const attemptSignal = AbortSignal.timeout(
      Math.min(options.attemptTimeoutMs, availableMs)
    )
    const signal = AbortSignal.any(
      [totalSignal, attemptSignal, externalSignal].filter(Boolean)
    )

    let response
    try {
      response = await fetchImpl(url, { ...init, signal })
    } catch (error) {
      if (
        !canRetryAfterError({
          retry,
          retryAttempt,
          options,
          totalSignal,
          externalSignal
        })
      ) {
        throw error
      }

      const errorRetryDelayMs = retryDelayMs(retryAttempt, options, random)
      if (!hasTimeForDelay(errorRetryDelayMs, options, startedAt, now)) {
        throw error
      }

      await waitFor(
        errorRetryDelayMs,
        AbortSignal.any([totalSignal, externalSignal].filter(Boolean))
      )
      continue
    }

    if (!canRetryResponse({ retry, response, retryAttempt, options })) {
      return response
    }

    const responseRetryDelayMs =
      retryAfterMs(response, now) ?? retryDelayMs(retryAttempt, options, random)
    if (!hasTimeForDelay(responseRetryDelayMs, options, startedAt, now)) {
      return response
    }

    await discardResponse(response)
    await waitFor(
      responseRetryDelayMs,
      AbortSignal.any([totalSignal, externalSignal].filter(Boolean))
    )
  }
}
