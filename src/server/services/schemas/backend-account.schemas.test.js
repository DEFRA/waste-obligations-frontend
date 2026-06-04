import { describe, expect, test } from 'vitest'

import { validateApiResponse } from '#/server/services/schemas/validate-api-response.js'
import { userOrganisationsResponseSchema } from '#/server/services/schemas/backend-account.schemas.js'

const accountServiceUserOrganisations = {
  user: {
    id: '79d0deab-c22d-4c30-8082-508ff8dc1bd7',
    firstName: 'Direct',
    lastName: 'Producer',
    email: 'test+directproducer@ee.com',
    roleInOrganisation: 'Admin',
    enrolmentStatus: 'Approved',
    serviceRole: 'Approved Person',
    service: 'EPR Packaging',
    serviceRoleId: 1,
    telephone: '07123456780',
    jobTitle: 'Director',
    isChangeRequestPending: false,
    numberOfOrganisations: 0,
    organisations: [
      {
        id: 'e2316c5e-d434-41da-8274-494dc0762d20',
        name: 'POP QUEST LTD',
        tradingName: '',
        organisationRole: 'Producer',
        organisationType: 'Companies House Company',
        organisationNumber: '100003',
        companiesHouseNumber: '17121895',
        producerType: null,
        nationId: 1,
        organisationAddress: null,
        jobTitle: null,
        subBuildingName: null,
        buildingName: null,
        buildingNumber: null,
        street: null,
        locality: null,
        dependentLocality: null,
        town: null,
        county: null,
        country: null,
        postcode: null,
        joinerDate: null,
        leaverCode: null,
        leaverDate: null,
        organisationChangeReason: null,
        personRoleInOrganisation: null,
        isChangeRequestPending: false,
        enrolments: null
      }
    ]
  }
}

describe('backend-account response schemas', () => {
  test('userOrganisationsResponseSchema accepts account service payload', () => {
    const value = validateApiResponse(
      userOrganisationsResponseSchema,
      accountServiceUserOrganisations,
      'backend-account'
    )

    expect(value.user.email).toBe('test+directproducer@ee.com')
    expect(value.user.organisations[0].organisationNumber).toBe('100003')
  })
})
