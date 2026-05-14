import { createWasteOrganisationsApiService } from '#/server/services/waste-organisations-api.service.js'
import { createWasteObligationsApiService } from '#/server/services/waste-obligations-api.service.js'

/**
 * Registers shared Waste Organisations / Waste Obligations HTTP clients on `server.app`.
 */
export const apiServices = {
  name: 'api-services',
  version: '1.0.0',
  register(server) {
    server.app.wasteOrganisationsApi = createWasteOrganisationsApiService()
    server.app.wasteObligationsApi = createWasteObligationsApiService()
  }
}
