import Boom from '@hapi/boom'

import { resolveComplianceOrganisationId } from './resolve-compliance-organisation-id.js'

export const obligations = {
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
      request.logger.warn(
        { err: error },
        `Failed to load organisation obligations for compliance submit: organisationId=${organisationId}, year=${year}`
      )

      throw Boom.badImplementation()
    }
  }
}
