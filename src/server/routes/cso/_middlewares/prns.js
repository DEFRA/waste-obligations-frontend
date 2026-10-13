import Boom from '@hapi/boom'
import { loadAwaitingAcceptancePrns } from '#/server/routes/_shared/prns/load-awaiting-acceptance-prns.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'

export const prns = {
  assign: 'prns',
  method: async (request) => {
    const { schemeId } = request.params
    const { search, material, sort, page, pageSize, year } = request.query

    try {
      return await loadAwaitingAcceptancePrns(
        request.server.app.wasteObligationsApi,
        schemeId,
        { search, material, sort, page, pageSize, year }
      )
    } catch (error) {
      logApplicationError(request.logger, 'warn', error, `Failed to load PRNs`)

      throw Boom.badImplementation()
    }
  }
}
