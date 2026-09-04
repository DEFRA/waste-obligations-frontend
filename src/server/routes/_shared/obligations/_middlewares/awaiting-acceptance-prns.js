import Boom from '@hapi/boom'

import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { resolveComplianceOrganisationId } from '#/server/common/routes/middleware/resolve-compliance-organisation-id.js'

const PRNS_PAGE_SIZE = 100

async function loadAwaitingAcceptancePrnsForYear(
  wasteObligationsApi,
  organisationId,
  year
) {
  const matching = []
  let page = 1
  let total = 0

  do {
    const response = await wasteObligationsApi.getOrganisationPrns(
      organisationId,
      {
        status: 'AwaitingAcceptance',
        page,
        pageSize: PRNS_PAGE_SIZE
      }
    )

    total = response.total ?? 0
    matching.push(
      ...(response.prns ?? []).filter(
        (prn) => Number(prn.obligationYear) === Number(year)
      )
    )
    page += 1
  } while ((page - 1) * PRNS_PAGE_SIZE < total)

  return {
    prns: matching,
    total: matching.length,
    page: 1,
    pageSize: matching.length || PRNS_PAGE_SIZE
  }
}

export const awaitingAcceptancePrns = {
  assign: 'awaitingAcceptancePrns',
  method: async (request) => {
    const organisationId = resolveComplianceOrganisationId(request)
    const year = request.query.year ?? new Date().getFullYear()

    try {
      return await loadAwaitingAcceptancePrnsForYear(
        request.server.app.wasteObligationsApi,
        organisationId,
        year
      )
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
