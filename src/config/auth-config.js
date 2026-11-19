/** How a sign-in is shared with other frontends behind the reverse proxy. */
export function createSharedAuthConfig(tokenTtlMs) {
  return {
    mode: {
      doc: 'How a sign-in is shared with other frontends behind the reverse proxy: off; session (one session cookie and session store for every frontend); token (a signed token cookie every frontend checks)',
      format: ['off', 'session', 'token'],
      default: 'off',
      env: 'SHARED_AUTH_MODE'
    },
    cookieName: {
      doc: 'Name of the signed token cookie shared by every frontend behind the reverse proxy',
      format: String,
      default: 'epr-shared-auth',
      env: 'SHARED_AUTH_COOKIE_NAME'
    },
    secret: {
      doc: 'Key every frontend behind the reverse proxy signs and checks the shared token with',
      format: String,
      default: '',
      env: 'SHARED_AUTH_SECRET',
      sensitive: true
    },
    issuer: {
      doc: 'Issuer and audience of the shared token',
      format: String,
      default: 'epr-cdp-frontends',
      env: 'SHARED_AUTH_ISSUER'
    },
    ttl: {
      doc: 'Shared token lifetime in milliseconds',
      format: Number,
      default: tokenTtlMs,
      env: 'SHARED_AUTH_TTL'
    },
    otherFrontend: {
      path: {
        doc: 'Path prefix of another frontend behind the same reverse proxy, for example /second-frontend. When set, the header links to the same page there, for trying a shared sign-in by hand',
        format: String,
        default: '',
        env: 'SHARED_AUTH_OTHER_FRONTEND_PATH'
      },
      name: {
        doc: 'Name shown in the header link to the other frontend',
        format: String,
        default: 'the other frontend',
        env: 'SHARED_AUTH_OTHER_FRONTEND_NAME'
      }
    }
  }
}

/** The Azure AD B2C tenant and this frontend's app registration. */
function createB2cAppConfig() {
  return {
    allowedHosts: {
      doc: 'Allowed authentication hostnames; leading-dot entries allow subdomains. Override replaces the defaults.',
      format: Array,
      default: ['.defra.cloud', '.defra.gov.uk'],
      env: 'AUTH_ALLOWED_HOSTS'
    },
    clientId: {
      doc: 'Azure AD B2C Client ID',
      format: String,
      default: '',
      env: 'AZURE_AD_B2C_CLIENT_ID'
    },
    clientSecret: {
      doc: 'Azure AD B2C Client Secret',
      format: String,
      default: '',
      env: 'AZURE_AD_B2C_CLIENT_SECRET',
      sensitive: true
    },
    tenantName: {
      doc: 'Azure AD B2C Tenant Name',
      format: String,
      default: '',
      env: 'AZURE_AD_B2C_TENANT_NAME'
    },
    instance: {
      doc: 'Azure AD B2C Instance (e.g., https://tenant.b2clogin.com)',
      format: String,
      default: '',
      env: 'AZURE_AD_B2C_INSTANCE'
    },
    domain: {
      doc: 'Azure AD B2C Domain (e.g., tenant.onmicrosoft.com)',
      format: String,
      default: '',
      env: 'AZURE_AD_B2C_DOMAIN'
    },
    userFlow: {
      doc: 'Azure AD B2C User Flow (e.g., B2C_1A_EPR_CUI_SignUpSignIn)',
      format: String,
      default: '',
      env: 'AZURE_AD_B2C_USER_FLOW'
    },
    tenantId: {
      doc: 'Azure AD B2C Tenant ID (GUID)',
      format: String,
      default: '',
      env: 'AZURE_AD_B2C_TENANT_ID'
    },
    postLogoutRedirectPath: {
      doc: 'Path or absolute URL for B2C post_logout_redirect_uri',
      format: String,
      default: '/signed-out',
      env: 'AZURE_AD_B2C_POST_LOGOUT_REDIRECT_PATH'
    }
  }
}

/** The sign-in cookie and the scopes asked for. */
function createB2cSignInConfig(isProduction) {
  return {
    cookieName: {
      doc: 'Auth cookie name for Bell OAuth state',
      format: String,
      default: 'waste-obligations-oauth-state',
      env: 'AUTH_COOKIE_NAME'
    },
    cookiePassword: {
      doc: 'Auth cookie password for Bell OAuth state',
      format: String,
      default: 'secret-password-must-be-at-least-32-characters-long',
      env: 'AUTH_COOKIE_PASSWORD',
      sensitive: true
    },
    isSecure: {
      doc: 'Is auth cookie secure',
      format: Boolean,
      default: isProduction,
      env: 'AUTH_COOKIE_SECURE'
    },
    scopes: {
      doc: 'Space or comma separated OAuth scopes to request from Azure AD B2C',
      format: String,
      default: 'openid profile offline_access',
      env: 'AZURE_AD_B2C_SCOPES'
    }
  }
}

/** Azure AD B2C sign-in and its cookies. */
export function createAuthConfig(isProduction) {
  return {
    azureAdB2c: {
      ...createB2cAppConfig(),
      ...createB2cSignInConfig(isProduction)
    }
  }
}
