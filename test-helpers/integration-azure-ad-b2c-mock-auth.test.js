import { describe, expect, test, vi } from 'vitest'

import { AZURE_AD_B2C_AUTH_STRATEGY } from '#/server/auth/azure-ad-b2c.js'
import {
  CSOC_INTEGRATION_USER_EMAIL,
  CSOC_INTEGRATION_USER_ID,
  PRODUCER_INTEGRATION_USER_EMAIL,
  PRODUCER_INTEGRATION_USER_ID
} from './integration-users.js'
import {
  isProducerIntegrationJourney,
  registerIntegrationMockAzureAdB2cAuth
} from './integration-azure-ad-b2c-mock-auth.js'

function createServerStub() {
  const strategies = []
  return {
    auth: {
      scheme: vi.fn((name, factory) => {
        strategies.push({ type: 'scheme', name, factory })
      }),
      strategy: vi.fn((name, scheme) => {
        strategies.push({ type: 'strategy', name, scheme })
      })
    },
    strategies
  }
}

function createRequest({ path = '/', returnUrl } = {}) {
  return {
    path,
    yar: {
      get: vi.fn((key) => (key === 'authReturnUrl' ? returnUrl : undefined))
    }
  }
}

describe('isProducerIntegrationJourney', () => {
  test('matches producer certificate and PRN paths', () => {
    expect(
      isProducerIntegrationJourney(
        createRequest({
          path: '/producer/d8f98659-87d8-4ef4-a9f2-e72f1bc98423/compliance/certificate'
        })
      )
    ).toBe(true)
    expect(
      isProducerIntegrationJourney(
        createRequest({
          path: '/producer/d8f98659-87d8-4ef4-a9f2-e72f1bc98423/prns'
        })
      )
    ).toBe(true)
  })

  test('matches a reverse-proxy producer return URL', () => {
    expect(
      isProducerIntegrationJourney(
        createRequest({
          path: '/signin-oidc',
          returnUrl:
            '/manage-recycling-obligations/producer/d8f98659-87d8-4ef4-a9f2-e72f1bc98423/compliance/certificate?year=2026'
        })
      )
    ).toBe(true)
  })

  test('does not match CSO paths', () => {
    expect(
      isProducerIntegrationJourney(
        createRequest({
          path: '/cso/a1b2c3d4-e5f6-4789-abcd-ef1234567890/compliance/statement'
        })
      )
    ).toBe(false)
    expect(
      isProducerIntegrationJourney(
        createRequest({
          path: '/signin-oidc',
          returnUrl:
            '/manage-recycling-obligations/cso/a1b2c3d4-e5f6-4789-abcd-ef1234567890/prns'
        })
      )
    ).toBe(false)
  })
})

describe('registerIntegrationMockAzureAdB2cAuth', () => {
  test('authenticates the producer profile for producer journeys', () => {
    const server = createServerStub()
    registerIntegrationMockAzureAdB2cAuth(server)

    const scheme = server.strategies.find((entry) => entry.type === 'scheme')
    const authenticate = scheme.factory().authenticate
    const h = {
      authenticated: vi.fn((credentials) => credentials)
    }

    authenticate(
      createRequest({
        path: '/producer/d8f98659-87d8-4ef4-a9f2-e72f1bc98423/prns'
      }),
      h
    )

    expect(server.auth.strategy).toHaveBeenCalledWith(
      AZURE_AD_B2C_AUTH_STRATEGY,
      'mock-azure-ad-b2c'
    )
    expect(h.authenticated).toHaveBeenCalledWith({
      credentials: expect.objectContaining({
        profile: expect.objectContaining({
          sub: PRODUCER_INTEGRATION_USER_ID,
          email: PRODUCER_INTEGRATION_USER_EMAIL
        })
      })
    })
  })

  test('authenticates the CSO profile for CSO journeys', () => {
    const server = createServerStub()
    registerIntegrationMockAzureAdB2cAuth(server)

    const scheme = server.strategies.find((entry) => entry.type === 'scheme')
    const authenticate = scheme.factory().authenticate
    const h = {
      authenticated: vi.fn((credentials) => credentials)
    }

    authenticate(
      createRequest({
        path: '/cso/a1b2c3d4-e5f6-4789-abcd-ef1234567890/compliance/statement'
      }),
      h
    )

    expect(h.authenticated).toHaveBeenCalledWith({
      credentials: expect.objectContaining({
        profile: expect.objectContaining({
          sub: CSOC_INTEGRATION_USER_ID,
          email: CSOC_INTEGRATION_USER_EMAIL
        })
      })
    })
  })
})
