import { createServer } from '#/server/server.js'
import { authenticate, injectAuthed } from '#/test-helpers/auth-helper.js'

describe('#contentSecurityPolicy', () => {
  let server
  let authHeaders

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    authHeaders = await authenticate(server)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should set the CSP policy header', async () => {
    const resp = await injectAuthed(
      server,
      {
        method: 'GET',
        url: '/'
      },
      authHeaders
    )

    expect(resp.headers['content-security-policy']).toBeDefined()
  })
})
