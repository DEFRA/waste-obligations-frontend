import Boom from '@hapi/boom'

export const declarations = {
  assign: 'declarations',
  method: async (request) => {
    const { organisationId } = request.params
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
