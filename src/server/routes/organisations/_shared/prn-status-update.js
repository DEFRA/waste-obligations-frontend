import Boom from '@hapi/boom'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { ApiError } from '#/server/services/base/api-error.js'
import { formatNameOnAccount } from '#/server/routes/compliance/_shared/name-on-account.js'
import { resolveComplianceOrganisationId } from '#/server/common/routes/middleware/resolve-compliance-organisation-id.js'

const STATUS_LOG_LABEL = {
  ACCEPTED: 'accept',
  REJECTED: 'reject'
}

// Statuses that mean "the PRN can no longer make this transition" — e.g. it was
// accepted in another tab, or cancelled upstream since the confirm page loaded.
// Not a fault in this service, so callers redirect rather than 500. Any other
// 4xx (bad request, auth) is a real fault and must surface as a 500 rather than
// being silently swallowed as "already accepted".
const TRANSITION_CONFLICT_STATUSES = new Set([
  statusCodes.conflict,
  statusCodes.gone,
  statusCodes.unprocessableEntity
])

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isTransitionConflict(error) {
  return (
    error instanceof ApiError && TRANSITION_CONFLICT_STATUSES.has(error.status)
  )
}

/**
 * Sends a PRN status change to the Waste Obligations API as a PATCH on
 * /organisations/{organisationId}/prns/{prnId}, using the signed-in user as
 * the actor.
 *
 * Producer routes carry `{organisationId}` in the path, CSO routes carry
 * `{schemeId}`; both resolve to the same downstream id, so accept either.
 *
 * Returns `true` when the API applied the change and `false` when the API
 * reports the PRN can no longer make this transition (a conflict / gone /
 * unprocessable response — e.g. it was already accepted or cancelled). Callers
 * redirect to the PRN page either way, which shows the real current status.
 * Throws a 500 (badImplementation) on any genuine failure: a server error,
 * network error, request validation, or any other client-error response.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {'ACCEPTED' | 'REJECTED'} status
 * @returns {Promise<boolean>}
 */
export async function submitPrnStatusUpdate(request, status) {
  const { prnId } = request.params

  const complianceOrganisationId = resolveComplianceOrganisationId(request)
  const locale = getLocale(request)
  const user = request.yar.get('user')

  try {
    await request.server.app.wasteObligationsApi.updatePrnStatus(
      complianceOrganisationId,
      prnId,
      {
        status,
        user: {
          id: user.id,
          email: user.email,
          name: formatNameOnAccount(user) || user.email,
          locale
        }
      }
    )

    return true
  } catch (error) {
    if (isTransitionConflict(error)) {
      logApplicationError(
        request.logger,
        'warn',
        error,
        `PRN ${STATUS_LOG_LABEL[status] ?? 'status'} update rejected as a transition conflict (${error.status}): organisationId=${complianceOrganisationId}, prnId=${prnId}`
      )

      return false
    }

    logApplicationError(
      request.logger,
      'error',
      error,
      `Failed to ${STATUS_LOG_LABEL[status] ?? 'update'} PRN: organisationId=${complianceOrganisationId}, prnId=${prnId}`
    )

    throw Boom.badImplementation()
  }
}
