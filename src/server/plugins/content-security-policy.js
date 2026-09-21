import Blankie from 'blankie'

import { config } from '#/config/config.js'
import { isAnalyticsConfigured } from '#/config/cookie-config.js'

export function getB2cOrigins() {
  const azure = config.get('auth.azureAdB2c')
  const origins = []

  if (azure.instance) {
    try {
      origins.push(new URL(azure.instance).origin)
    } catch {
      // ignore invalid instance URL in config
    }
  }

  if (azure.tenantName) {
    origins.push(`https://${azure.tenantName}.b2clogin.com`)
  }

  return origins
}

const googleAnalyticsHost = 'https://*.google-analytics.com'
const googleTagManagerHost = 'https://*.googletagmanager.com'

function googleAnalyticsCspSources() {
  if (
    !isAnalyticsConfigured(
      config.get('googleAnalytics.googleTagManagerKey'),
      config.get('googleAnalytics.measurementId')
    )
  ) {
    return {
      connectSrc: [],
      scriptSrc: [],
      imgSrc: [],
      frameSrc: []
    }
  }

  return {
    connectSrc: [
      googleAnalyticsHost,
      'https://*.analytics.google.com',
      googleTagManagerHost
    ],
    scriptSrc: [googleTagManagerHost, googleAnalyticsHost],
    imgSrc: [googleTagManagerHost, googleAnalyticsHost],
    frameSrc: ['https://www.googletagmanager.com']
  }
}

/**
 * Build the Blankie plugin so Google hosts are only allowed when analytics
 * IDs are configured at process start.
 */
export function createContentSecurityPolicy() {
  const b2cOrigins = getB2cOrigins()
  const googleSources = googleAnalyticsCspSources()

  return {
    plugin: Blankie,
    options: {
      // Hash 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=' is to support a GOV.UK frontend script bundled within Nunjucks macros
      // https://frontend.design-system.service.gov.uk/import-javascript/#if-our-inline-javascript-snippet-is-blocked-by-a-content-security-policy
      defaultSrc: ['self'],
      fontSrc: ['self', 'data:'],
      connectSrc: [
        'self',
        'wss',
        'data:',
        ...googleSources.connectSrc,
        ...b2cOrigins
      ],
      mediaSrc: ['self'],
      styleSrc: ['self'],
      scriptSrc: [
        'self',
        "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='",
        ...googleSources.scriptSrc
      ],
      imgSrc: ['self', 'data:', ...googleSources.imgSrc],
      frameSrc: ['self', 'data:', ...googleSources.frameSrc, ...b2cOrigins],
      objectSrc: ['none'],
      frameAncestors: ['none'],
      formAction: ['self', ...b2cOrigins],
      manifestSrc: ['self'],
      generateNonces: true
    }
  }
}
