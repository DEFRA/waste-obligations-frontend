import { randomUUID } from 'node:crypto'
import { subscribe, unsubscribe } from 'node:diagnostics_channel'

import { logApplicationError } from './application-error.js'

export function logDownstreamRequests(logger) {
  const requests = new WeakMap()
  const listeners = {
    'undici:request:create': ({ request }) => {
      const url = new URL(request.path, request.origin)
      const details = `downstreamRequestId=${randomUUID()}, method=${request.method}, origin=${url.origin}, path=${url.pathname}`
      requests.set(request, { details, startedAt: performance.now() })
      logger.info(`Downstream request initiated: ${details}`)
    },
    'undici:request:headers': ({ request, response }) => {
      const state = requests.get(request)
      if (state) {
        logger.info(
          `Downstream response received: ${state.details}, statusCode=${response.statusCode}, durationMs=${Math.round(performance.now() - state.startedAt)}`
        )
      }
    },
    'undici:request:error': ({ request, error }) => {
      const state = requests.get(request)
      if (state) {
        logApplicationError(
          logger,
          'warn',
          error,
          `Downstream request failed: ${state.details}, durationMs=${Math.round(performance.now() - state.startedAt)}`
        )
      }
    }
  }

  for (const [name, listener] of Object.entries(listeners)) {
    subscribe(name, listener)
  }

  return () => {
    for (const [name, listener] of Object.entries(listeners)) {
      unsubscribe(name, listener)
    }
  }
}
