import Boom from '@hapi/boom'

import { throwNotFoundForApi404 } from '#/server/common/helpers/throw-not-found-for-api-404.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { resolveComplianceOrganisationId } from '#/server/common/routes/middleware/resolve-compliance-organisation-id.js'

export const obligationsForYear = {
  assign: 'obligations',
  method: async (request) => {
    const organisationId = resolveComplianceOrganisationId(request)
    const { year } = request.query

    try {
      const result =
        await request.server.app.wasteObligationsApi.getOrganisationObligations(
          organisationId,
          year
        )

      return result.obligations
    } catch (error) {
      throwNotFoundForApi404(error)

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
