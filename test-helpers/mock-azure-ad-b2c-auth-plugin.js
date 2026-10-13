import { registerMockAzureAdB2cAuth } from '#/test-helpers/azure-ad-b2c-mock-auth.js'

export const mockAzureAdB2cAuth = {
  plugin: {
    name: 'mock-azure-ad-b2c-auth',
    register(server) {
      registerMockAzureAdB2cAuth(server)
    }
  }
}
