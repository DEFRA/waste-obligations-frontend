import { ProxyAgent, setGlobalDispatcher } from 'undici'

import { createLogger } from '../logging/logger.js'
import { config } from '../../../../config/config.js'

const logger = createLogger()

/**
 * Configures undici fetch() to use the CDP forward proxy.
 * Bell / @hapi/wreck (Azure AD B2C token exchange) is configured separately via
 * wreck-proxy-configuration so HTTPS CONNECT through Squid works correctly.
 */
export function setupProxy() {
  const proxyUrl = config.get('httpProxy')

  if (proxyUrl) {
    logger.info('setting up undici proxy dispatcher')
    setGlobalDispatcher(new ProxyAgent(proxyUrl))
  }
}
