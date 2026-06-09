import Wreck from '@hapi/wreck'
import { HttpsProxyAgent } from 'https-proxy-agent'

import { config } from '#/config/config.js'

export const wreckProxyConfiguration = {
  name: 'wreck-proxy-configuration',
  async register() {
    const proxyUrl = config.get('httpsProxy') ?? config.get('httpProxy')

    if (!proxyUrl) {
      return
    }

    const httpsAgent = new HttpsProxyAgent(proxyUrl)

    Wreck.agents.http = httpsAgent
    Wreck.agents.https = httpsAgent
    Wreck.agents.httpsAllowUnauthorized = httpsAgent
  }
}
