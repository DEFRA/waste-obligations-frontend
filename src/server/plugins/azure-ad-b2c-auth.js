import bell from '@hapi/bell'

import { config } from '#/config/config.js'
import {
  AZURE_AD_B2C_AUTH_STRATEGY,
  bellRedirectOrigin,
  buildB2cOAuthEndpoint,
  decodeIdTokenProfile
} from '#/server/auth/azure-ad-b2c.js'

function parseScopes(scopes) {
  if (typeof scopes !== 'string') {
    return []
  }
  return scopes
    .split(/[\s,]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

function isGuidLike(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

function sanitiseScopes(scopes, clientId, logger) {
  const removed = []
  const cleaned = scopes.filter((scope) => {
    // Common misconfiguration: client_id is mistakenly included as a scope.
    if (scope === clientId || isGuidLike(scope)) {
      removed.push(scope)
      return false
    }
    return true
  })

  if (removed.length) {
    logger?.warn?.(
      `Ignoring invalid Azure AD B2C scopes (client ID / GUIDs are not valid scopes): removedScopes=${removed.join(',')}`
    )
  }

  return cleaned
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

      if (!azureAdB2cConfig.clientId || !azureAdB2cConfig.clientSecret) {
        server.logger.warn(
          'Azure AD B2C is not configured (AZURE_AD_B2C_CLIENT_ID / AZURE_AD_B2C_CLIENT_SECRET). Sign-in will not work until these are set.'
        )
      }

      const configuredScopes = sanitiseScopes(
        parseScopes(azureAdB2cConfig.scopes),
        azureAdB2cConfig.clientId,
        server.logger
      )
      const requestedScopes = configuredScopes.length
        ? configuredScopes
        : ['openid', 'profile', 'offline_access']
      const authorizeEndpoint = buildB2cOAuthEndpoint(
        azureAdB2cConfig,
        'oauth2/v2.0/authorize'
      )
      const tokenEndpoint = buildB2cOAuthEndpoint(
        azureAdB2cConfig,
        'oauth2/v2.0/token'
      )
      const discoveryEndpoint = buildB2cOAuthEndpoint(
        azureAdB2cConfig,
        'v2.0/.well-known/openid-configuration'
      )
      const redirectOrigin = bellRedirectOrigin(
        azureAdB2cConfig.redirectUri,
        tls,
        {
          host: config.get('host'),
          port: config.get('port')
        }
      )

      server.auth.strategy(AZURE_AD_B2C_AUTH_STRATEGY, 'bell', {
        provider: {
          name: AZURE_AD_B2C_AUTH_STRATEGY,
          protocol: 'oauth2',
          useParamsAuth: true,
          auth: authorizeEndpoint,
          token: tokenEndpoint,
          scope: requestedScopes,
          profile(credentials, params) {
            credentials.profile = decodeIdTokenProfile(params.id_token)
          }
        },
        password: azureAdB2cConfig.cookiePassword,
        clientId: azureAdB2cConfig.clientId,
        clientSecret: azureAdB2cConfig.clientSecret,
        isSecure: azureAdB2cConfig.isSecure,
        isSameSite: 'Lax',
        location: redirectOrigin,
        config: {
          tenant: azureAdB2cConfig.tenantId || azureAdB2cConfig.domain,
          discovery: discoveryEndpoint
        }
      })
    }
  }
}
