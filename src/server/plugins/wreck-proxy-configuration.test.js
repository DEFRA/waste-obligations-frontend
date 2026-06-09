import Wreck from '@hapi/wreck'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { config } from '#/config/config.js'
import { wreckProxyConfiguration } from './wreck-proxy-configuration.js'

describe('wreck-proxy-configuration plugin', () => {
  let originalAgents

  beforeEach(() => {
    originalAgents = {
      http: Wreck.agents.http,
      https: Wreck.agents.https,
      httpsAllowUnauthorized: Wreck.agents.httpsAllowUnauthorized
    }
  })

  afterEach(() => {
    config.set('httpProxy', null)
    config.set('httpsProxy', null)
    Wreck.agents.http = originalAgents.http
    Wreck.agents.https = originalAgents.https
    Wreck.agents.httpsAllowUnauthorized = originalAgents.httpsAllowUnauthorized
  })

  test('uses proxied Wreck agents when HTTP_PROXY is set', async () => {
    config.set('httpProxy', 'http://localhost:3128')

    await wreckProxyConfiguration.register()

    expect(Wreck.agents.https).toEqual(
      expect.objectContaining({
        connectOpts: expect.objectContaining({ host: 'localhost', port: 3128 })
      })
    )
  })

  test('uses proxied Wreck agents when HTTPS_PROXY is set', async () => {
    config.set('httpsProxy', 'http://localhost:3128')

    await wreckProxyConfiguration.register()

    expect(Wreck.agents.https).toEqual(
      expect.objectContaining({
        connectOpts: expect.objectContaining({ host: 'localhost', port: 3128 })
      })
    )
  })

  test('leaves default Wreck agents when no proxy is configured', async () => {
    await wreckProxyConfiguration.register()

    expect(Wreck.agents.https?.connectOpts).toBeUndefined()
  })
})
