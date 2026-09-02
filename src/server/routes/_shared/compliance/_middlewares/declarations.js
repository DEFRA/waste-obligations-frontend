import Boom from '@hapi/boom'

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
