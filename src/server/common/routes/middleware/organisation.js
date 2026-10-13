import Boom from '@hapi/boom'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { ApiError } from '#/server/services/base/api-error.js'

import { resolveComplianceOrganisationId } from './resolve-compliance-organisation-id.js'

export const organisation = {
  assign: 'organisation',
  method: async (request) => {
    const id = resolveComplianceOrganisationId(request)

    try {
      return await request.server.app.wasteOrganisationsApi.getOrganisation(id)
    } catch (error) {
      if (error instanceof ApiError && error.status === statusCodes.notFound) {
        throw Boom.notFound()
      }

      logApplicationError(
        request.logger,
        'warn',
        error,
        `Failed to load organisation details: organisationId=${id}`
      )

      throw Boom.badImplementation()
    }
  }
}
