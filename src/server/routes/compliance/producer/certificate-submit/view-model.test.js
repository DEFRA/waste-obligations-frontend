import { describe, expect, test } from 'vitest'

import {
  MOCK_AUTH_ORGANISATION_ID,
  MOCK_AUTH_USER_EMAIL,
  MOCK_AUTH_USER_ID
} from '#/test-helpers/auth-test-constants.js'

import { buildCertificateSubmitViewModel } from './view-model.js'

const organisationId = MOCK_AUTH_ORGANISATION_ID

function buildRequest(overrides = {}) {
  return {
    query: { year: 2026, ...overrides.query },
    yar: {
      get(key) {
        if (key === 'user') {
          return {
            id: MOCK_AUTH_USER_ID,
            email: MOCK_AUTH_USER_EMAIL,
            firstName: 'Jane',
            lastName: 'Doe'
          }
        }

        return undefined
      }
    },
    pre: {
      currentOrganisation: {
        id: organisationId,
        organisationNumber: '100003'
      },
      ...overrides.pre
    },
    ...overrides
  }
}

function buildCachedPayload() {
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
    organisationId,
    obligationYear: 2026,
    obligations: [
      {
        material: 'Plastic',
        recyclingTarget: 0.75,
        tonnages: {
          material: 100,
          awaitingAcceptance: 0,
          accepted: 100,
          outstanding: 0,
          obligated: 75
        },
        status: 'Met'
      }
    ],
    obligationStatus: 'Met',
    regulatorName: 'Environment Agency',
    regulatorEmail: 'packagingproducers@environment-agency.gov.uk'
  }
}

describe('buildCertificateSubmitViewModel', () => {
  test('builds the submit page view model', () => {
    const model = buildCertificateSubmitViewModel(
      buildRequest(),
      buildCachedPayload()
    )

    expect(model).toMatchObject({
      year: 2026,
      pageTitle: 'Check and submit your certificate of compliance',
      nameOnAccount: 'Jane Doe',
      fullNameInput: '',
      organisationName: 'Example Org',
      organisationNumber: '100003',
      formErrors: null
    })
    expect(model.obligationsTableRows.length).toBeGreaterThan(0)
  })

  test('prefixes the page title and preserves entered input when there are form errors', () => {
    const formErrors = {
      summary: [{ text: 'You must enter your full name', href: '#fullName' }],
      fields: { fullName: 'You must enter your full name' }
    }

    const model = buildCertificateSubmitViewModel(
      buildRequest(),
      buildCachedPayload(),
      {
        formErrors,
        fullNameInput: ''
      }
    )

    expect(model.pageTitle).toBe(
      'Error: Check and submit your certificate of compliance'
    )
    expect(model.fullNameInput).toBe('')
    expect(model.formErrors).toEqual(formErrors)
  })
})
