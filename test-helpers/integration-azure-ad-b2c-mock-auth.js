import { AZURE_AD_B2C_AUTH_STRATEGY } from '#/server/auth/azure-ad-b2c.js'

const INTEGRATION_CSOC_USER_ID = '00000000-0000-4000-8000-000000000001'
const INTEGRATION_CSOC_USER_EMAIL = 'csoc.integration@example.com'
const INTEGRATION_PRODUCER_USER_ID = '00000000-0000-4000-8000-000000000002'
const INTEGRATION_PRODUCER_USER_EMAIL = 'producer.integration@example.com'

function isProducerIntegrationJourney(request) {
  const returnUrl = request.yar?.get?.('authReturnUrl') ?? ''
  const path = `${request.path}${returnUrl}`

  return path.includes('/compliance/producer')
}

function resolveIntegrationMockProfile(request) {
  if (isProducerIntegrationJourney(request)) {
    return {
      sub: INTEGRATION_PRODUCER_USER_ID,
      oid: INTEGRATION_PRODUCER_USER_ID,
      email: INTEGRATION_PRODUCER_USER_EMAIL,
      given_name: 'Producer',
      family_name: 'Integration'
    }
  }

  return {
    sub: INTEGRATION_CSOC_USER_ID,
    oid: INTEGRATION_CSOC_USER_ID,
    email: INTEGRATION_CSOC_USER_EMAIL,
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
