import Boom from '@hapi/boom'
import { throwNotFoundForApi404 } from '#/server/common/helpers/throw-not-found-for-api-404.js'
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
      throwNotFoundForApi404(error)

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
