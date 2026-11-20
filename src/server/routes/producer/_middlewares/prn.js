import Boom from '@hapi/boom'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'

export const prn = {
  assign: 'prn',
  method: async (request) => {
    const { organisationId, prnId } = request.params

    try {
      return await request.server.app.wasteObligationsApi.getPrn(
        organisationId,
        prnId
      )
    } catch (error) {
      if (error?.status === statusCodes.notFound) {
        throw Boom.notFound()
      }

      logApplicationError(
        request.logger,
        'warn',
        error,
        `Failed to load PRN: prnId=${prnId}`
      )

      throw Boom.badImplementation()
    }
  }
}
