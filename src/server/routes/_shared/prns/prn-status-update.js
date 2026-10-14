import Boom from '@hapi/boom'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { ApiError } from '#/server/services/base/api-error.js'
import { formatNameOnAccount } from '#/server/routes/_shared/compliance/name-on-account.js'
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

// The signed-in user, as the actor the API records against the status change.
function buildStatusUpdateUser(request) {
  const user = request.yar.get('user')

  return {
    id: user.id,
    email: user.email,
    name: formatNameOnAccount(user) || user.email,
    locale: getLocale(request)
  }
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

  try {
    await request.server.app.wasteObligationsApi.updatePrnStatus(
      complianceOrganisationId,
      prnId,
      { status, user: buildStatusUpdateUser(request) }
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

/**
 * Sends one status change for several PRNs to the Waste Obligations API as a
 * PATCH on /organisations/{organisationId}/prns, using the signed-in user as
 * the actor. The API applies it to every PRN or to none.
 *
 * A bulk update is all-or-nothing, so a rejected batch has no partial outcome.
 * Returns `true` when every PRN was updated, and `false` when the API answers
 * with a transition conflict (409, 410 or 422): a PRN is no longer awaiting
 * acceptance, for example after a duplicate submit or a change made elsewhere,
 * and nothing was updated. The caller decides what that means for the user.
 * When the API answers 404 (a selected PRN no longer exists) this throws a 404
 * so the user sees the not found page. Any other failure throws a 500 so the
 * user sees the general error page.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {string[]} prnIds
 * @param {'ACCEPTED' | 'REJECTED'} status
 * @param {number} [obligationYear] the year every PRN is accepted into, as
 *   resolved by resolveSelectionAcceptanceYear; the API records it as sent.
 *   Left out of the request body when undefined
 * @returns {Promise<boolean>}
 */
export async function submitPrnStatusesUpdate(
  request,
  prnIds,
  status,
  obligationYear
) {
  const complianceOrganisationId = resolveComplianceOrganisationId(request)

  try {
    await request.server.app.wasteObligationsApi.updatePrnStatuses(
      complianceOrganisationId,
      {
        status,
        prnIds,
        user: buildStatusUpdateUser(request),
        obligationYear
      }
    )

    return true
  } catch (error) {
    const label = STATUS_LOG_LABEL[status] ?? 'status'

    if (isTransitionConflict(error)) {
      logApplicationError(
        request.logger,
        'warn',
        error,
        `Bulk PRN ${label} update rejected as a transition conflict (${error.status}): organisationId=${complianceOrganisationId}, prnCount=${prnIds.length}`
      )

      return false
    }

    if (error instanceof ApiError && error.status === statusCodes.notFound) {
      logApplicationError(
        request.logger,
        'warn',
        error,
        `Bulk PRN ${label} update rejected as a selected PRN was not found: organisationId=${complianceOrganisationId}, prnCount=${prnIds.length}`
      )

      throw Boom.notFound()
    }

    logApplicationError(
      request.logger,
      'error',
      error,
      `Failed to ${STATUS_LOG_LABEL[status] ?? 'update'} PRNs in bulk: organisationId=${complianceOrganisationId}, prnCount=${prnIds.length}`
    )

    throw Boom.badImplementation()
  }
}
