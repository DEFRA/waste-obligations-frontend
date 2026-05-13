import { createWasteObligationsApiService } from '#/server/services/waste-obligations-api.service.js'

export const obligations = {
  assign: 'obligations',
  method: async (request) => {
    const { organisationId } = request.params
    const { year } = request.query
    const traceId = request.app.traceId

    try {
      return await createWasteObligationsApiService().getOrganisationObligations(
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
