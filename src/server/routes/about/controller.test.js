import { createTestServer } from '#/test-helpers/create-test-server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { authenticate, injectAuthed } from '#/test-helpers/auth-helper.js'

describe('#aboutController', () => {
  let server
  let authHeaders

  beforeAll(async () => {
    server = await createTestServer()
    await server.initialize()
    authHeaders = await authenticate(server)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: '/about'
      },
      authHeaders
    )

    expect(result).toEqual(expect.stringContaining('About |'))
    expect(statusCode).toBe(statusCodes.ok)
  })
})
