import { describe, expect, test } from 'vitest'

import { createServer } from '#/server/server.js'

describe('crumb plugin', () => {
  test('registers CSRF protection on the server', async () => {
    const server = await createServer()

    expect(server.plugins.crumb).toBeDefined()
    expect(typeof server.plugins.crumb.generate).toBe('function')

    await server.stop({ timeout: 0 })
  })
})
