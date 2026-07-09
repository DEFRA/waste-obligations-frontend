import { registerIntegrationMockAzureAdB2cAuth } from '#/test-helpers/integration-azure-ad-b2c-mock-auth.js'

export const integrationMockAzureAdB2cAuth = {
  plugin: {
    name: 'integration-mock-azure-ad-b2c-auth',
    register(server) {
      registerIntegrationMockAzureAdB2cAuth(server)
    }
  }
}
