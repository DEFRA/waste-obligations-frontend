import { describe, expect, test } from 'vitest'

import { createTestServer } from '#/test-helpers/create-test-server.js'

describe('crumb plugin', () => {
  test('registers CSRF protection on the server', async () => {
    const server = await createTestServer()

    expect(server.plugins.crumb).toBeDefined()
    expect(typeof server.plugins.crumb.generate).toBe('function')

    await server.stop({ timeout: 0 })
  })
})
