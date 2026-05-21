import Blankie from 'blankie'

import { config } from '#/config/config.js'

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

const b2cOrigins = getB2cOrigins()

/**
 * Manage content security policies.
 * @satisfies {import('@hapi/hapi').Plugin}
 */
const contentSecurityPolicy = {
  plugin: Blankie,
  options: {
    // Hash 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=' is to support a GOV.UK frontend script bundled within Nunjucks macros
    // https://frontend.design-system.service.gov.uk/import-javascript/#if-our-inline-javascript-snippet-is-blocked-by-a-content-security-policy
    defaultSrc: ['self'],
    fontSrc: ['self', 'data:'],
    connectSrc: ['self', 'wss', 'data:', ...b2cOrigins],
    mediaSrc: ['self'],
    styleSrc: ['self'],
    scriptSrc: [
      'self',
      "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='"
    ],
    imgSrc: ['self', 'data:'],
    frameSrc: ['self', 'data:', ...b2cOrigins],
    objectSrc: ['none'],
    frameAncestors: ['none'],
    formAction: ['self', ...b2cOrigins],
    manifestSrc: ['self'],
    generateNonces: false
  }
}

export { contentSecurityPolicy }
