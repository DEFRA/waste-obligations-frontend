const RETRYABLE_STATUS_CODES = new Set([408, 429])

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
    (response.status >= 500 && response.status <= 599)
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
    if (availableMs <= 0 || totalSignal.aborted) {
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
        !retry ||
        retryAttempt >= options.maxRetryAttempts ||
        totalSignal.aborted ||
        externalSignal?.aborted
      ) {
        throw error
      }

      const delayMs = retryDelayMs(retryAttempt, options, random)
      if (delayMs >= remainingMs(options, startedAt, now)) {
        throw error
      }

      await waitFor(
        delayMs,
        AbortSignal.any([totalSignal, externalSignal].filter(Boolean))
      )
      continue
    }

    if (
      !retry ||
      !isRetryableResponse(response) ||
      retryAttempt >= options.maxRetryAttempts
    ) {
      return response
    }

    const delayMs =
      retryAfterMs(response, now) ?? retryDelayMs(retryAttempt, options, random)
    if (delayMs >= remainingMs(options, startedAt, now)) {
      return response
    }

    await discardResponse(response)
    await waitFor(
      delayMs,
      AbortSignal.any([totalSignal, externalSignal].filter(Boolean))
    )
  }
}
