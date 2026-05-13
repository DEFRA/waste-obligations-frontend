export const declarations = {
  assign: 'declarations',
  method: async (request) => {
    const { organisationId } = request.params
    const { year } = request.query
    const traceId = request.app.traceId

    try {
      return await request.server.app.wasteObligationsApi.getComplianceDeclarations(
        organisationId,
        year,
        traceId
      )
    } catch (error) {
      request.logger.error(
        { err: error, organisationId, year },
        'Failed to load compliance declarations for certificate success'
      )
    }
    return null
  }
}
