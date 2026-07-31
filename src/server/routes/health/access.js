import { timingSafeEqual } from 'node:crypto'

import Boom from '@hapi/boom'

import { config } from '#/config/config.js'

export const HEALTH_ALL_TOKEN_HEADER = 'x-health-check-token'

export function isHealthAllTokenValid(actualToken, expectedToken) {
  if (
    typeof actualToken !== 'string' ||
    typeof expectedToken !== 'string' ||
    expectedToken.length === 0
  ) {
    return false
  }

  const actual = Buffer.from(actualToken)
  const expected = Buffer.from(expectedToken)

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function healthAllAccess(request, h) {
  const expectedToken =
    request.server.app.healthAllToken ?? config.get('health.all.token')
  const actualToken = request.headers[HEALTH_ALL_TOKEN_HEADER]

  if (!isHealthAllTokenValid(actualToken, expectedToken)) {
    throw Boom.unauthorized()
  }

  return h.continue
}
