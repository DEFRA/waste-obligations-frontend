import Boom from '@hapi/boom'

import { resolveComplianceOrganisationId } from './resolve-compliance-organisation-id.js'

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
      request.logger.warn(
        { err: error },
        `Failed to load compliance declarations: organisationId=${organisationId}, year=${year}`
      )

      throw Boom.badImplementation()
    }
  }
}
