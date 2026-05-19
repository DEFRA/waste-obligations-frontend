import bell from '@hapi/bell'

import { config } from '#/config/config.js'
import {
  AZURE_AD_B2C_AUTH_STRATEGY,
  bellRedirectOrigin,
  buildB2cOAuthEndpoint
} from '#/server/auth/azure-ad-b2c.js'

function decodeIdTokenProfile(idToken) {
  if (!idToken) {
    return {}
  }

  const payload = idToken.split('.')[1]
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
}

export const azureAdB2cAuth = {
  plugin: {
    name: 'azure-ad-b2c-auth',
    async register(server) {
      await server.register(bell)

      if (config.get('isTest')) {
        const { registerMockAzureAdB2cAuth } =
          await import('#/test-helpers/azure-ad-b2c-mock-auth.js')
        registerMockAzureAdB2cAuth(server)
        return
      }

      const azureAdB2cConfig = config.get('auth.azureAdB2c')
      const tls = server.settings.tls

      server.auth.strategy(AZURE_AD_B2C_AUTH_STRATEGY, 'bell', {
        provider: {
          name: AZURE_AD_B2C_AUTH_STRATEGY,
          protocol: 'oauth2',
          useParamsAuth: true,
          auth: buildB2cOAuthEndpoint(
            azureAdB2cConfig,
            'oauth2/v2.0/authorize'
          ),
          token: buildB2cOAuthEndpoint(azureAdB2cConfig, 'oauth2/v2.0/token'),
          scope: ['openid', 'profile', 'offline_access'],
          profile(credentials, params) {
            credentials.profile = decodeIdTokenProfile(params.id_token)
          }
        },
        password: azureAdB2cConfig.cookiePassword,
        clientId: azureAdB2cConfig.clientId,
        clientSecret: azureAdB2cConfig.clientSecret,
        isSecure: azureAdB2cConfig.isSecure,
        location: bellRedirectOrigin(azureAdB2cConfig.redirectUri, tls, {
          host: config.get('host'),
          port: config.get('port')
        }),
        config: {
          tenant: azureAdB2cConfig.tenantId || azureAdB2cConfig.domain,
          discovery: buildB2cOAuthEndpoint(
            azureAdB2cConfig,
            'v2.0/.well-known/openid-configuration'
          )
        }
      })
    }
  }
}
