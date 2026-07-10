import { createBackendAccountApiService } from '#/server/services/backend-account-api.service.js'
import { createWasteOrganisationsApiService } from '#/server/services/waste-organisations-api.service.js'
import { createWasteObligationsApiService } from '#/server/services/waste-obligations-api.service.js'

export function createApiServicesPlugin({
  createBackendAccountApiClient = (server) =>
    createBackendAccountApiService({
      cacheClient: server.app.redisClient
    })
} = {}) {
  return {
    name: 'api-services',
    version: '1.0.0',
    register(server) {
      server.app.backendAccountApi = createBackendAccountApiClient(server)
      server.app.wasteOrganisationsApi = createWasteOrganisationsApiService()
      server.app.wasteObligationsApi = createWasteObligationsApiService()
    }
  }
}

export const apiServices = createApiServicesPlugin()
