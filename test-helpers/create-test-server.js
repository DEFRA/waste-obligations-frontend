import { createServer } from '#/server/server.js'
import { createApiServicesPlugin } from '#/server/plugins/api-services.js'
import { createMockBackendAccountApiService } from '#/test-helpers/mock-backend-account-api.js'
import { mockAzureAdB2cAuth } from '#/test-helpers/mock-azure-ad-b2c-auth-plugin.js'

const testApiServices = createApiServicesPlugin({
  createBackendAccountApiClient: () => createMockBackendAccountApiService()
})

export function createTestServer({
  authPlugin = mockAzureAdB2cAuth,
  apiServicesPlugin = testApiServices,
  ...options
} = {}) {
  return createServer({ authPlugin, apiServicesPlugin, ...options })
}
