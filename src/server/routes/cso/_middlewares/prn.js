import Boom from '@hapi/boom'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'

export const prn = {
  assign: 'prn',
  method: async (request) => {
    const { schemeId, prnId } = request.params

    try {
      return await request.server.app.wasteObligationsApi.getPrn(
        schemeId,
        prnId
      )
    } catch (error) {
      logApplicationError(
        request.logger,
        'warn',
        error,
        `Failed to load PRN: prnId=${prnId}`
      )

      if (error?.status === statusCodes.notFound) {
        throw Boom.notFound()
      }

      throw Boom.badImplementation()
    }
  }
}
