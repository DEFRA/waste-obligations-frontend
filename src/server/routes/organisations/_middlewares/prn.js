import Boom from '@hapi/boom'

export const prn = {
  assign: 'prn',
  method: async (request) => {
    const { organisationId, prnId } = request.params

    try {
      return await request.server.app.wasteObligationsApi.getPrn(
        organisationId,
        prnId
      )
    } catch (error) {
      request.logger.warn(
        { err: error },
        `Failed to load PRN: organisationId=${organisationId}, prnId=${prnId}`
      )

      throw Boom.badImplementation()
    }
  }
}
