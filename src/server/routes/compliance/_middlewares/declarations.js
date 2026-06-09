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
        {
          err: error,
          event: {
            action: 'load-declarations',
            category: 'compliance',
            outcome: 'failure'
          },
          tenant: { message: `organisationId=${organisationId}, year=${year}` }
        },
        'Failed to load compliance declarations'
      )

      return null
    }
  }
}
