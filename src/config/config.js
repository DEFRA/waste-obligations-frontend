import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import convictFormatWithValidator from 'convict-format-with-validator'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const fourHoursMs = 14400000
const oneWeekMs = 604800000

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const isDevelopment = process.env.NODE_ENV === 'development'

convict.addFormats(convictFormatWithValidator)

export const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3000,
    env: 'PORT'
  },
  staticCacheTimeout: {
    doc: 'Static cache timeout in milliseconds',
    format: Number,
    default: oneWeekMs,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'waste-obligations-frontend'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.resolve(dirname, '../..')
  },
  assetPath: {
    doc: 'Asset path',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDevelopment
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: process.env.NODE_ENV !== 'test',
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : [],
      env: 'LOG_REDACT'
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  session: {
    cache: {
      engine: {
        doc: 'backend cache is written to',
        format: ['redis', 'memory'],
        default: isProduction ? 'redis' : 'memory',
        env: 'SESSION_CACHE_ENGINE'
      },
      name: {
        doc: 'Server-side session cache name',
        format: String,
        default: 'session',
        env: 'SESSION_CACHE_NAME'
      },
      ttl: {
        doc: 'server side session cache ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_CACHE_TTL'
      }
    },
    cookie: {
      name: {
        doc: 'Session cookie name',
        format: String,
        default: 'waste-obligations-session',
        env: 'SESSION_COOKIE_NAME'
      },
      ttl: {
        doc: 'Session cookie ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_COOKIE_TTL'
      },
      password: {
        doc: 'session cookie password',
        format: String,
        default: 'the-password-must-be-at-least-32-characters-long',
        env: 'SESSION_COOKIE_PASSWORD',
        sensitive: true
      },
      secure: {
        doc: 'set secure flag on cookie',
        format: Boolean,
        default: isProduction,
        env: 'SESSION_COOKIE_SECURE'
      }
    }
  },
  csrf: {
    cookie: {
      name: {
        doc: 'CSRF cookie and form field name',
        format: String,
        default: 'waste-obligations-csrf',
        env: 'CSRF_COOKIE_NAME'
      }
    }
  },
  redis: {
    host: {
      doc: 'Redis cache host',
      format: String,
      default: '127.0.0.1',
      env: 'REDIS_HOST'
    },
    username: {
      doc: 'Redis cache username',
      format: String,
      default: '',
      env: 'REDIS_USERNAME'
    },
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: '',
      sensitive: true,
      env: 'REDIS_PASSWORD'
    },
    keyPrefix: {
      doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
      format: String,
      default: 'waste-obligations-frontend:',
      env: 'REDIS_KEY_PREFIX'
    },
    useSingleInstanceCache: {
      doc: 'Connect to a single instance of redis instead of a cluster.',
      format: Boolean,
      default: !isProduction,
      env: 'USE_SINGLE_INSTANCE_CACHE'
    },
    useTLS: {
      doc: 'Connect to redis using TLS',
      format: Boolean,
      default: isProduction,
      env: 'REDIS_TLS'
    }
  },
  nunjucks: {
    watch: {
      doc: 'Reload templates when they are changed.',
      format: Boolean,
      default: isDevelopment
    },
    noCache: {
      doc: 'Use a cache and recompile templates each time',
      format: Boolean,
      default: isDevelopment
    }
  },
  tracing: {
    header: {
      doc: 'Which header to track',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  auth: {
    azureAdB2c: {
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
      },
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
  },
  backendAccountApi: {
    baseUrl: {
      doc: 'Backend account microservice base URL (includes /api/)',
      format: String,
      default: 'http://localhost:8003/api/',
      env: 'BACKEND_ACCOUNT_API_BASE_URL'
    },
    authMode: {
      doc: 'Authentication mode for backend account API',
      format: ['basic', 'bearer', 'none'],
      default: 'bearer',
      env: 'BACKEND_ACCOUNT_API_AUTH_MODE'
    },
    clientId: {
      doc: 'OAuth client ID for backend account API client credentials (MO-119)',
      format: String,
      default: '',
      env: 'BACKEND_ACCOUNT_API_OAUTH_CLIENT_ID'
    },
    clientSecret: {
      doc: 'OAuth client secret for backend account API client credentials',
      format: String,
      default: '',
      env: 'BACKEND_ACCOUNT_API_OAUTH_CLIENT_SECRET',
      sensitive: true
    },
    tokenEndpoint: {
      doc: 'OAuth token endpoint for backend account API client credentials',
      format: String,
      default: '',
      env: 'BACKEND_ACCOUNT_API_OAUTH_TOKEN_ENDPOINT'
    },
    scope: {
      doc: 'OAuth scope for backend account API (typically {app-id}/.default)',
      format: String,
      default: '',
      env: 'BACKEND_ACCOUNT_API_OAUTH_SCOPE'
    }
  },
  wasteOrganisationsApi: {
    baseUrl: {
      doc: 'Waste organisations API base URL',
      format: String,
      default: 'http://localhost:9090',
      env: 'WASTE_ORGANISATIONS_API_BASE_URL'
    },
    authMode: {
      doc: 'Authentication mode for waste organisations API',
      format: ['basic', 'bearer', 'none'],
      default: 'basic',
      env: 'WASTE_ORGANISATIONS_API_AUTH_MODE'
    },
    clientId: {
      doc: 'Client ID for waste APIs',
      format: String,
      default: 'Developer',
      env: 'WASTE_ORGANISATIONS_API_CLIENT_ID'
    },
    clientSecret: {
      doc: 'Client secret for waste APIs',
      format: String,
      default: 'developer-pwd',
      env: 'WASTE_ORGANISATIONS_API_CLIENT_SECRET',
      sensitive: true
    }
  },
  wasteObligationsApi: {
    baseUrl: {
      doc: 'Waste obligations API base URL',
      format: String,
      default: 'http://localhost:8080',
      env: 'WASTE_OBLIGATIONS_API_BASE_URL'
    },
    authMode: {
      doc: 'Authentication mode for waste obligations API',
      format: ['basic', 'bearer', 'none'],
      default: 'basic',
      env: 'WASTE_OBLIGATIONS_API_AUTH_MODE'
    },
    clientId: {
      doc: 'Client ID for waste obligations API',
      format: String,
      default: 'Developer',
      env: 'WASTE_OBLIGATIONS_API_CLIENT_ID'
    },
    clientSecret: {
      doc: 'Client secret for waste obligations API',
      format: String,
      default: 'developer-pwd',
      env: 'WASTE_OBLIGATIONS_API_CLIENT_SECRET',
      sensitive: true
    }
  },
  eprPackaging: {
    homeUrl: {
      doc: 'EPR packaging service home URL',
      format: String,
      default: 'https://localhost:7084/report-data',
      env: 'EPR_PACKAGING_HOME_URL'
    },
    manageAccountUrl: {
      doc: 'EPR packaging manage account URL',
      format: String,
      default: 'https://localhost:7084/manage-account',
      env: 'EPR_PACKAGING_MANAGE_ACCOUNT_URL'
    },
    clearSessionUrl: {
      doc: 'EPR packaging clear-session URL used after the local CDP session is cleared',
      format: String,
      default: 'https://localhost:7084/report-data/Account/ClearSession',
      env: 'EPR_PACKAGING_CLEAR_SESSION_URL'
    },
    signInUrl: {
      doc: 'EPR packaging sign-in URL used after cross-app session clearing completes',
      format: String,
      default: 'https://localhost:7084/report-data/Account/SignIn',
      env: 'EPR_PACKAGING_SIGN_IN_URL'
    },
    feedbackUrl: {
      doc: 'Service feedback survey URL',
      format: String,
      default:
        'https://defragroup.eu.qualtrics.com/jfe/form/SV_e5HK8ijKACZGi1M',
      env: 'SERVICE_FEEDBACK_URL'
    },
    manageYourRecyclingObligationsUrl: {
      doc: 'Manage your recycling obligations URL',
      format: String,
      default:
        'https://localhost:7084/report-data/manage-your-recycling-obligations',
      env: 'MANAGE_YOUR_RECYCLING_OBLIGATIONS_URL'
    },
    supportEmail: {
      doc: 'EPR customer service email address',
      format: String,
      default: 'eprcustomerservice@defra.gov.uk',
      env: 'EPR_SUPPORT_EMAIL'
    },
    supportTelephone: {
      doc: 'EPR customer service telephone number',
      format: String,
      default: '0300 060 0002',
      env: 'EPR_SUPPORT_TELEPHONE'
    },
    privacyUrl: {
      doc: 'EPR privacy notice URL',
      format: String,
      default:
        'https://www.gov.uk/guidance/extended-producer-responsibility-for-packaging-privacy-policy',
      env: 'EPR_PRIVACY_URL'
    },
    accessibilityUrl: {
      doc: 'EPR accessibility statement URL',
      format: String,
      default:
        'https://www.gov.uk/guidance/extended-producer-responsibility-for-packaging-accessibility-statement',
      env: 'EPR_ACCESSIBILITY_URL'
    }
  }
})

config.validate({ allowed: 'strict' })
