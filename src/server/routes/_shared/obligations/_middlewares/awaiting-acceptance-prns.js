import Boom from '@hapi/boom'

import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { resolveComplianceOrganisationId } from '#/server/common/routes/middleware/resolve-compliance-organisation-id.js'
import { loadAcceptablePrnsSummary } from '#/server/routes/_shared/prns/load-awaiting-acceptance-prns.js'

const PRNS_PAGE_SIZE = 100

export const awaitingAcceptancePrns = {
  assign: 'awaitingAcceptancePrns',
  method: async (request) => {
    const organisationId = resolveComplianceOrganisationId(request)
    const { year } = request.query

    try {
      const { prns, total } = await loadAcceptablePrnsSummary(
        request.server.app.wasteObligationsApi,
        organisationId,
        year,
        PRNS_PAGE_SIZE
      )

      return { prns, total, page: 1, pageSize: PRNS_PAGE_SIZE }
    } catch (error) {
      logApplicationError(
        request.logger,
        'warn',
        error,
        `Failed to load awaiting acceptance PRNs: organisationId=${organisationId}, year=${year}`
      )

      throw Boom.badImplementation()
    }
  }
}
