import {
  EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
  EPR_PACKAGING_SERVICE_NAME
} from '#/server/auth/constants.js'
import {
  MOCK_AUTH_USER_EMAIL,
  MOCK_AUTH_USER_ID
} from '#/test-helpers/auth-test-constants.js'

const eligibleUserOrganisations = {
  user: {
    id: MOCK_AUTH_USER_ID,
    email: MOCK_AUTH_USER_EMAIL,
    serviceRole: EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
    service: EPR_PACKAGING_SERVICE_NAME,
    organisations: [{ organisationNumber: '154977' }]
  }
}

export function createMockBackendAccountApiService() {
  return {
    async getUserOrganisations() {
      return eligibleUserOrganisations
    }
  }
}
