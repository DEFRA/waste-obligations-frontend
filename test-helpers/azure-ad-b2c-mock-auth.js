import { AZURE_AD_B2C_AUTH_STRATEGY } from '#/server/auth/azure-ad-b2c.js'

import {
  MOCK_AUTH_USER_EMAIL,
  MOCK_AUTH_USER_ID
} from '#/test-helpers/auth-test-constants.js'

export function registerMockAzureAdB2cAuth(server) {
  server.auth.scheme('mock-azure-ad-b2c', () => ({
    authenticate: (_request, h) =>
      h.authenticated({
        credentials: {
          token: 'mock-access-token',
          profile: {
            sub: MOCK_AUTH_USER_ID,
            oid: MOCK_AUTH_USER_ID,
            email: MOCK_AUTH_USER_EMAIL,
            given_name: 'Test',
            family_name: 'User'
          }
        }
      })
  }))
  server.auth.strategy(AZURE_AD_B2C_AUTH_STRATEGY, 'mock-azure-ad-b2c')
}
