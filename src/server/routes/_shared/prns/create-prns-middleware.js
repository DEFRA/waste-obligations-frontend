import Boom from '@hapi/boom'

import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { loadAwaitingAcceptancePrns } from './load-awaiting-acceptance-prns.js'

/**
 * Producer and CSO lists both load awaiting-acceptance PRNs for one id.
 * The only difference is which route param holds it.
 *
 * @param {'organisationId'|'schemeId'} idParam
 */
export function createPrnsMiddleware(idParam) {
  return {
    assign: 'prns',
    method: async (request) => {
      const id = request.params[idParam]
      const { search, material, sort, page, pageSize, year } = request.query

      try {
        return await loadAwaitingAcceptancePrns(
          request.server.app.wasteObligationsApi,
          id,
          { search, material, sort, page, pageSize, year }
        )
      } catch (error) {
        logApplicationError(
          request.logger,
          'warn',
          error,
          `Failed to load PRNs`
        )

        throw Boom.badImplementation()
      }
    }
  }
}
