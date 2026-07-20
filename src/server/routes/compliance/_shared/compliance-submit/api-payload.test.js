import { describe, expect, test } from 'vitest'

import {
  MOCK_AUTH_USER_EMAIL,
  MOCK_AUTH_USER_ID
} from '#/test-helpers/auth-test-constants.js'

import {
  buildProducerComplianceDeclarationPayload,
  buildStatementComplianceDeclarationPayload
} from './api-payload.js'

const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

function buildUser() {
  return {
    id: MOCK_AUTH_USER_ID,
    email: MOCK_AUTH_USER_EMAIL,
    firstName: 'Jane',
    lastName: 'Doe'
  }
}

function buildProducerCachedPayload() {
  return {
    organisation: {
      id: organisationId,
      name: 'Example Org',
      address: {
        addressLine1: '1 High Street',
        town: 'Bristol',
        postcode: 'BS1 1AA'
      },
      registrations: [
        {
          type: 'LARGE_PRODUCER',
          status: 'REGISTERED',
          registrationYear: 2026,
          updated: '2026-05-18T11:20:00Z'
        }
      ]
    },
    obligationYear: 2026,
    obligations: [{ material: 'Plastic', status: 'Met' }],
    obligationStatus: 'Met',
    regulatorName: 'Environment Agency',
    regulatorEmail: 'packagingproducers@environment-agency.gov.uk'
  }
}

function buildStatementCachedPayload() {
  return {
    organisation: {
      id: organisationId,
      name: 'Scheme Operator Ltd',
      tradingName: 'Scheme Trading Name',
      address: {
        addressLine1: '2 High Street',
        town: 'Cardiff',
        postcode: 'CF10 1AA'
      },
      registrations: [
        {
          type: 'COMPLIANCE_SCHEME',
          status: 'REGISTERED',
          registrationYear: 2026,
          updated: '2026-05-18T11:20:00Z'
        }
      ]
    },
    obligationYear: 2026,
    obligations: [{ material: 'Glass', status: 'Met' }],
    obligationStatus: 'Met',
    regulatorName: 'Natural Resources Wales',
    regulatorEmail: 'packaging@naturalresourceswales.gov.uk',
    organisationNumber: '100003'
  }
}

describe('buildProducerComplianceDeclarationPayload', () => {
  test('builds producer declaration payload from cached submit data', () => {
    expect(
      buildProducerComplianceDeclarationPayload({
        cachedPayload: buildProducerCachedPayload(),
        user: buildUser(),
        fullName: '  Jane Doe  ',
        organisationNumber: '100003',
        locale: 'en'
      })
    ).toEqual({
      organisation: {
        id: organisationId,
        registrationType: 'DirectProducer',
        name: 'Example Org',
        referenceNumber: '100003',
        address: {
          addressLine1: '1 High Street',
          town: 'Bristol',
          postcode: 'BS1 1AA'
        },
        complianceSchemeName: null,
        schemeOperatorName: null,
        regulator: 'Environment Agency',
        regulatorEmail: 'packagingproducers@environment-agency.gov.uk'
      },
      obligations: [{ material: 'Plastic', status: 'Met' }],
      obligationYear: 2026,
      obligationStatus: 'Met',
      submitterName: 'Jane Doe',
      submitterLocale: 'EN',
      user: {
        id: MOCK_AUTH_USER_ID,
        email: MOCK_AUTH_USER_EMAIL,
        name: 'Jane Doe'
      }
    })
  })

  test('sets submitterLocale when locale is Welsh', () => {
    expect(
      buildProducerComplianceDeclarationPayload({
        cachedPayload: buildProducerCachedPayload(),
        user: buildUser(),
        fullName: 'Jane Doe',
        organisationNumber: '100003',
        locale: 'cy'
      }).submitterLocale
    ).toBe('CY')
  })
})

describe('buildStatementComplianceDeclarationPayload', () => {
  test('builds statement declaration payload from cached submit data', () => {
    expect(
      buildStatementComplianceDeclarationPayload({
        cachedPayload: buildStatementCachedPayload(),
        user: buildUser(),
        fullName: 'Jane Doe',
        regulation43Compliant: 'yes',
        locale: 'en'
      })
    ).toEqual({
      organisation: {
        id: organisationId,
        registrationType: 'ComplianceScheme',
        name: null,
        referenceNumber: '100003',
        address: {
          addressLine1: '2 High Street',
          town: 'Cardiff',
          postcode: 'CF10 1AA'
        },
        complianceSchemeName: 'Scheme Trading Name',
        schemeOperatorName: 'Scheme Operator Ltd',
        regulator: 'Natural Resources Wales',
        regulatorEmail: 'packaging@naturalresourceswales.gov.uk'
      },
      obligations: [{ material: 'Glass', status: 'Met' }],
      obligationYear: 2026,
      obligationStatus: 'Met',
      submitterName: 'Jane Doe',
      isRegulation43Compliant: true,
      submitterLocale: 'EN',
      user: {
        id: MOCK_AUTH_USER_ID,
        email: MOCK_AUTH_USER_EMAIL,
        name: 'Jane Doe'
      }
    })
  })

  test('maps regulation 43 no to false', () => {
    expect(
      buildStatementComplianceDeclarationPayload({
        cachedPayload: buildStatementCachedPayload(),
        user: buildUser(),
        fullName: 'Jane Doe',
        regulation43Compliant: 'no',
        locale: 'en'
      }).isRegulation43Compliant
    ).toBe(false)
  })

  test('sets submitterLocale when locale is Welsh', () => {
    expect(
      buildStatementComplianceDeclarationPayload({
        cachedPayload: buildStatementCachedPayload(),
        user: buildUser(),
        fullName: 'Jane Doe',
        regulation43Compliant: 'yes',
        locale: 'cy'
      }).submitterLocale
    ).toBe('CY')
  })
})
