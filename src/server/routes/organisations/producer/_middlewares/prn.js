import Boom from '@hapi/boom'
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
