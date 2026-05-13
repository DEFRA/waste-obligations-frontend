export const obligations = {
  assign: 'obligations',
  method: async (request) => {
    const { organisationId } = request.params
    const { year } = request.query
    const traceId = request.app.traceId

    try {
      return await request.server.app.wasteObligationsApi.getOrganisationObligations(
        organisationId,
        year,
        traceId
      )
    } catch (error) {
      request.logger.error(
        { err: error, organisationId, year },
        'Failed to load organisation obligations for certificate submit'
      )
    }
    return null
  }
}
