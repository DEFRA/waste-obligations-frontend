import Boom from '@hapi/boom'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'

export const prns = {
  assign: 'prns',
  method: async (request) => {
    const { schemeId } = request.params
    const { search, status, sort, page, pageSize } = request.query

    try {
      return await request.server.app.wasteObligationsApi.getOrganisationPrns(
        schemeId,
        { search, status, sort, page, pageSize }
      )
    } catch (error) {
      logApplicationError(request.logger, 'warn', error, `Failed to load PRNs`)

      throw Boom.badImplementation()
    }
  }
}
