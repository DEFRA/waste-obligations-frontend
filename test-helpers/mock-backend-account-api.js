import { EPR_PACKAGING_SERVICE_NAME } from '#/server/auth/constants.js'
import {
  MOCK_AUTH_ORGANISATION_ID,
  MOCK_AUTH_USER_EMAIL,
  MOCK_AUTH_USER_ID
} from '#/test-helpers/auth-test-constants.js'

export const mockEligibleUserOrganisations = {
  user: {
    id: MOCK_AUTH_USER_ID,
    email: MOCK_AUTH_USER_EMAIL,
    firstName: 'Test',
    lastName: 'User',
    serviceRole: 'Approved Person',
    service: EPR_PACKAGING_SERVICE_NAME,
    organisations: [
      {
        id: MOCK_AUTH_ORGANISATION_ID,
        name: 'Test Organisation',
        organisationNumber: '154977'
      }
    ]
  }
}

export function createMockBackendAccountApiService() {
  return {
    async getUserOrganisations() {
      return mockEligibleUserOrganisations
    }
  }
}
