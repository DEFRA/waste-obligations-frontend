export const obligations = {
  assign: 'obligations',
  method: async (request) => {
    const { organisationId } = request.params
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
        {
          err: error,
          event: {
            action: 'load-obligations',
            category: 'compliance',
            outcome: 'failure'
          },
          tenant: { message: `organisationId=${organisationId}, year=${year}` }
        },
        'Failed to load organisation obligations for certificate submit'
      )

      return null
    }
  }
}
