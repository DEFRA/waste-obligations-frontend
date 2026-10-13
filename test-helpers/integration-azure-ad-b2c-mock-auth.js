import { AZURE_AD_B2C_AUTH_STRATEGY } from '#/server/auth/azure-ad-b2c.js'
import {
  CSOC_INTEGRATION_USER_EMAIL,
  CSOC_INTEGRATION_USER_ID,
  PRODUCER_INTEGRATION_USER_EMAIL,
  PRODUCER_INTEGRATION_USER_ID
} from './integration-users.js'

const PRODUCER_PATH = /(?:^|\/)producer\//

function isProducerFrontendPath(value) {
  return PRODUCER_PATH.test(String(value).split('?')[0])
}

export function isProducerIntegrationJourney(request) {
  const returnUrl = request.yar?.get?.('authReturnUrl') ?? ''

  return (
    isProducerFrontendPath(request.path) || isProducerFrontendPath(returnUrl)
  )
}

function resolveIntegrationMockProfile(request) {
  if (isProducerIntegrationJourney(request)) {
    return {
      sub: PRODUCER_INTEGRATION_USER_ID,
      oid: PRODUCER_INTEGRATION_USER_ID,
      email: PRODUCER_INTEGRATION_USER_EMAIL,
      given_name: 'Producer',
      family_name: 'Integration'
    }
  }

  return {
    sub: CSOC_INTEGRATION_USER_ID,
    oid: CSOC_INTEGRATION_USER_ID,
    email: CSOC_INTEGRATION_USER_EMAIL,
    given_name: 'CSoC',
    family_name: 'Integration'
  }
}

export function registerIntegrationMockAzureAdB2cAuth(server) {
  server.auth.scheme('mock-azure-ad-b2c', () => ({
    authenticate: (request, h) => {
      const profile = resolveIntegrationMockProfile(request)

      return h.authenticated({
        credentials: {
          token: 'mock-access-token',
          profile
        }
      })
    }
  }))
  server.auth.strategy(AZURE_AD_B2C_AUTH_STRATEGY, 'mock-azure-ad-b2c')
}
