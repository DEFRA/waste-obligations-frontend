import { config } from '#/config/config.js'
import { createBackendAccountApiService } from '#/server/services/backend-account-api.service.js'
import { createWasteOrganisationsApiService } from '#/server/services/waste-organisations-api.service.js'
import { createWasteObligationsApiService } from '#/server/services/waste-obligations-api.service.js'

export const apiServices = {
  name: 'api-services',
  version: '1.0.0',
  async register(server) {
    if (config.get('isTest')) {
      const { createMockBackendAccountApiService } =
        await import('#/test-helpers/mock-backend-account-api.js')
      server.app.backendAccountApi = createMockBackendAccountApiService()
    } else {
      server.app.backendAccountApi = createBackendAccountApiService()
    }
    server.app.wasteOrganisationsApi = createWasteOrganisationsApiService()
    server.app.wasteObligationsApi = createWasteObligationsApiService()
  }
}
