import Boom from '@hapi/boom'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { ApiError } from '#/server/services/base/api-error.js'

export const organisation = {
  assign: 'organisation',
  method: async (request) => {
    const { organisationId } = request.params

    try {
      return await request.server.app.wasteOrganisationsApi.getOrganisation(
        organisationId
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === statusCodes.notFound) {
        throw Boom.notFound()
      }

      request.logger.warn(
        { err: error, organisationId },
        'Failed to load organisation details'
      )

      throw Boom.badImplementation()
    }
  }
}
