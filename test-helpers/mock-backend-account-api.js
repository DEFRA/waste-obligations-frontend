import {
  EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
  EPR_PACKAGING_SERVICE_NAME
} from '#/server/auth/constants.js'
import {
  MOCK_AUTH_ORGANISATION_ID,
  MOCK_AUTH_USER_EMAIL,
  MOCK_AUTH_USER_ID
} from '#/test-helpers/auth-test-constants.js'

export const MOCK_COMPLIANCE_SCHEME_ID = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890'

export const mockEligibleUserOrganisations = {
  user: {
    id: MOCK_AUTH_USER_ID,
    email: MOCK_AUTH_USER_EMAIL,
    firstName: 'Test',
    lastName: 'User',
    serviceRole: EPR_PACKAGING_APPROVED_PERSON_SERVICE_ROLE,
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

export function createMockBackendAccountApiService({ serviceRole } = {}) {
  return {
    async getUserOrganisations() {
      return {
        user: {
          ...mockEligibleUserOrganisations.user,
          serviceRole:
            serviceRole ?? mockEligibleUserOrganisations.user.serviceRole
        }
      }
    },
    async getComplianceSchemesForOperator() {
      return [
        {
          id: MOCK_COMPLIANCE_SCHEME_ID,
          name: 'Test Compliance Scheme'
        }
      ]
    }
  }
}
