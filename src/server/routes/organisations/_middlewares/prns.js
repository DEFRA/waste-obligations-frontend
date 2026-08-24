import Boom from '@hapi/boom'

export const prns = {
  assign: 'prns',
  method: async (request) => {
    const { organisationId } = request.params
    const { search, status, sort, page, pageSize } = request.query

    try {
      return await request.server.app.wasteObligationsApi.getOrganisationPrns(
        organisationId,
        { search, status, sort, page, pageSize }
      )
    } catch (error) {
      request.logger.warn(
        { err: error },
        `Failed to load PRNs: organisationId=${organisationId}`
      )

      throw Boom.badImplementation()
    }
  }
}
