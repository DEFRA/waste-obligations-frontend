import hapi from '@hapi/hapi'
import { afterEach, describe, expect, test } from 'vitest'

import {
  getLoadTestRequestHeaders,
  isLoadTestRequest
} from '#/server/common/helpers/load-test/request-context.js'
import { createLoadTestRequestContextPlugin } from './load-test-request-context.js'

const sessionKey = '12a5a318-3bc1-4c30-8082-508ff8dc1bd7:17'

let server

async function createServer(enabled) {
  server = hapi.server()
  await server.register(createLoadTestRequestContextPlugin({ enabled }))
  server.route({
    method: 'GET',
    path: '/',
    handler: () => ({
      headers: getLoadTestRequestHeaders(),
      isLoadTestRequest: isLoadTestRequest()
    })
  })
}

afterEach(async () => {
  await server?.stop()
  server = undefined
})

describe('load-test request context plugin', () => {
  test('makes a validated load-test session available during the request lifecycle', async () => {
    await createServer(true)

    const response = await server.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-epr-load-test-session': sessionKey }
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      headers: { 'X-EPR-Load-Test-Session': sessionKey },
      isLoadTestRequest: true
    })
  })

  test('does not expose invalid or disabled load-test sessions', async () => {
    await createServer(false)

    const response = await server.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-epr-load-test-session': 'not-a-session-key' }
    })

    expect(response.statusCode).toBe(200)
    expect(response.result).toEqual({
      headers: null,
      isLoadTestRequest: false
    })
  })
})
