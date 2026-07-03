import Boom from '@hapi/boom'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { ApiError } from '#/server/services/base/api-error.js'

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

async function loadUserFromAccountService(request) {
  const sessionUser = request.yar.get('user')

  if (!sessionUser?.id) {
    return sessionUser
  }

  try {
    const response =
      await request.server.app.backendAccountApi.getUserOrganisations(
        sessionUser.id
      )

    if (!response?.user) {
      return sessionUser
    }

    const user = {
      ...sessionUser,
      ...response.user,
      organisations: response.user.organisations ?? []
    }
    request.yar.set('user', user)
    return user
  } catch (error) {
    request.logger.warn(
      { err: error },
      `Failed to load user organisations for compliance scheme access: userId=${sessionUser.id}`
    )
    return sessionUser
  }
}

export const currentComplianceScheme = {
  assign: 'currentComplianceScheme',
  method: async (request) => {
    const { schemeId } = request.params
    const user = await loadUserFromAccountService(request)
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

        request.logger.warn(
          { err: error },
          `Failed to load compliance schemes for operator: organisationId=${operatorOrganisationId}`
        )
        throw Boom.badImplementation()
      }
    }

    request.logger.warn(
      `User attempted to access compliance scheme without operator enrolment: userId=${user?.id}, schemeId=${schemeId}, operatorOrganisationIds=${operatorOrganisationIds.join(',')}`
    )

    throw Boom.notFound()
  }
}
