import { statusCodes } from '#/server/common/constants/status-codes.js'
import Boom from '@hapi/boom'

export const organisation = {
  assign: 'organisation',
  method: async (request) => {
    const { organisationId } = request.params
    const { traceId } = request.app

    try {
      return await request.server.app.wasteOrganisationsApi.getOrganisation(
        organisationId,
        traceId
      )
    } catch (error) {
      if (error?.status === statusCodes.notFound) {
        throw Boom.notFound()
      }

      request.logger.warn(
        { err: error, organisationId },
        'Failed to load organisation details'
      )
    }

    return null
  }
}
