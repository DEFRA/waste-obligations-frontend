import Boom from '@hapi/boom'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { ApiError } from '#/server/services/base/api-error.js'

export const complianceDeclaration = {
  assign: 'complianceDeclaration',
  method: async (request) => {
    const { organisationId, complianceDeclarationId } = request.params
    const resolvedComplianceDeclarationId =
      complianceDeclarationId ?? request.query.complianceDeclarationId

    try {
      return await request.server.app.wasteObligationsApi.getComplianceDeclaration(
        organisationId,
        resolvedComplianceDeclarationId
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === statusCodes.notFound) {
        throw Boom.notFound()
      }

      request.logger.warn(
        { err: error },
        `Failed to load compliance declaration: organisationId=${organisationId}, complianceDeclarationId=${resolvedComplianceDeclarationId}`
      )

      throw Boom.badImplementation()
    }
  }
}
