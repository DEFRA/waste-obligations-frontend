import Boom from '@hapi/boom'

import { throwNotFoundForApi404 } from '#/server/common/helpers/throw-not-found-for-api-404.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'

import { resolveComplianceOrganisationId } from '#/server/common/routes/middleware/resolve-compliance-organisation-id.js'

export const declarations = {
  assign: 'declarations',
  method: async (request) => {
    const organisationId = resolveComplianceOrganisationId(request)
    const { year } = request.query

    try {
      const result =
        await request.server.app.wasteObligationsApi.getComplianceDeclarations(
          organisationId,
          year
        )
      return result.complianceDeclarations
    } catch (error) {
      throwNotFoundForApi404(error)

      logApplicationError(
        request.logger,
        'warn',
        error,
        `Failed to load compliance declarations: organisationId=${organisationId}, year=${year}`
      )

      throw Boom.badImplementation()
    }
  }
}
