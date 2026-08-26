import Boom from '@hapi/boom'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { ApiError } from '#/server/services/base/api-error.js'
import { refreshSessionUser } from './refresh-session-user.js'

function schemeIdMatches(schemes, schemeId) {
  const targetId = String(schemeId).toLowerCase()

  return schemes.find(
    (scheme) => scheme?.id && String(scheme.id).toLowerCase() === targetId
  )
}

function pickSchemeForOperator(schemes, schemeId, operatorOrganisationId) {
  const matchedScheme = schemeIdMatches(schemes, schemeId)
  if (matchedScheme) {
    return matchedScheme
  }

  const operatorOrgMatchesPath =
    String(operatorOrganisationId).toLowerCase() ===
    String(schemeId).toLowerCase()

  if (operatorOrgMatchesPath && schemes.length === 1) {
    return schemes[0]
  }

  return null
}

function collectOperatorOrganisationIds(user) {
  return (user?.organisations ?? [])
    .map((organisation) => organisation?.id)
    .filter(Boolean)
}

async function loadSchemesForOperator(request, operatorOrganisationId) {
  return request.server.app.backendAccountApi.getComplianceSchemesForOperator(
    operatorOrganisationId
  )
}

async function resolveSchemeForOperatorOrganisation(
  request,
  operatorOrganisationId,
  schemeId
) {
  const schemes = await loadSchemesForOperator(request, operatorOrganisationId)
  const scheme = pickSchemeForOperator(
    schemes,
    schemeId,
    operatorOrganisationId
  )

  if (!scheme) {
    return null
  }

  return {
    scheme,
    schemeId: scheme.id,
    operatorOrganisationId
  }
}

export const currentComplianceScheme = {
  assign: 'currentComplianceScheme',
  method: async (request) => {
    const { schemeId } = request.params
    const user = await refreshSessionUser(request)
    const operatorOrganisationIds = collectOperatorOrganisationIds(user)

    for (const operatorOrganisationId of operatorOrganisationIds) {
      try {
        const resolved = await resolveSchemeForOperatorOrganisation(
          request,
          operatorOrganisationId,
          schemeId
        )

        if (resolved) {
          return resolved
        }
      } catch (error) {
        if (
          error instanceof ApiError &&
          error.status === statusCodes.notFound
        ) {
          continue
        }

        logApplicationError(
          request.logger,
          'warn',
          error,
          `Failed to load compliance schemes for operator: organisationId=${operatorOrganisationId}`
        )
        throw Boom.badImplementation()
      }
    }

    request.logger.warn(
      `User attempted to access compliance scheme without operator enrolment: userId=${user?.id}, schemeId=${schemeId}, operatorOrganisationIds=${operatorOrganisationIds.join(',')}`
    )

    throw Boom.forbidden()
  }
}
