import bell from '@hapi/bell'

import { config } from '#/config/config.js'
import { paths } from '#/config/paths.js'
import {
  AZURE_AD_B2C_AUTH_STRATEGY,
  BELL_AZURE_AD_B2C_COOKIE,
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
      {
        event: {
          action: 'sanitise-b2c-scopes',
          category: 'configuration',
          outcome: 'failure',
          reason: 'invalid-scopes'
        },
        tenant: { message: `removedScopes=${removed.join(',')}` }
      },
      'Ignoring invalid Azure AD B2C scopes (client ID / GUIDs are not valid scopes)'
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

      server.ext('onPreAuth', (request, h) => {
        if (request.path === paths.signInOidc && request.query?.code) {
          request.logger?.info?.(
            `Azure AD B2C sign-in callback received before token exchange: hasCode=true hasState=${Boolean(request.query.state)} hasBellStateCookie=${Boolean(
              request.state?.[BELL_AZURE_AD_B2C_COOKIE]
            )}`
          )
        }

        return h.continue
      })

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
          scope: requestedScopes,
          profile(credentials, params) {
            server.logger.info?.(
              `Azure AD B2C token response received: hasAccessToken=${Boolean(params.access_token)} hasIdToken=${Boolean(params.id_token)} hasRefreshToken=${Boolean(params.refresh_token)} expiresIn=${params.expires_in} tokenType=${params.token_type}`
            )
            credentials.profile = decodeIdTokenProfile(params.id_token)
          }
        },
        password: azureAdB2cConfig.cookiePassword,
        clientId: azureAdB2cConfig.clientId,
        clientSecret: azureAdB2cConfig.clientSecret,
        isSecure: azureAdB2cConfig.isSecure,
        isSameSite: 'Lax',
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
