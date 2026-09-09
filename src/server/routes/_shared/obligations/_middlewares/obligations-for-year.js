import Boom from '@hapi/boom'

import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { resolveComplianceOrganisationId } from '#/server/common/routes/middleware/resolve-compliance-organisation-id.js'

export const obligationsForYear = {
  assign: 'obligations',
  method: async (request) => {
    const organisationId = resolveComplianceOrganisationId(request)
    const year = request.query.year ?? new Date().getFullYear()

    try {
      const result =
        await request.server.app.wasteObligationsApi.getOrganisationObligations(
          organisationId,
          year
        )

      return result.obligations
    } catch (error) {
      logApplicationError(
        request.logger,
        'warn',
        error,
        `Failed to load organisation obligations: organisationId=${organisationId}, year=${year}`
      )

      throw Boom.badImplementation()
    }
  }
}
