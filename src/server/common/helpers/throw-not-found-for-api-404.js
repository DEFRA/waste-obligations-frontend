import Boom from '@hapi/boom'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { ApiError } from '#/server/services/base/api-error.js'

/**
 * Turns an API "not found" answer into the Page not found response, so a
 * request for an organisation, scheme or note that does not exist is not
 * reported as a service error. Any other error is left for the caller.
 *
 * @param {unknown} error
 */
export function throwNotFoundForApi404(error) {
  if (error instanceof ApiError && error.status === statusCodes.notFound) {
    throw Boom.notFound()
  }
}
