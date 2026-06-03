import { EPR_PACKAGING_SERVICE_NAME } from '#/server/auth/account-service-constants.js'

const eligibleUserOrganisations = {
  user: {
    email: 'test.user@example.com',
    serviceRole: 'Approved Person',
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
