import { createTestServer } from '#/test-helpers/create-test-server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#healthController', () => {
  let server

  beforeAll(async () => {
    server = await createTestServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(result).toEqual({ message: 'success' })
    expect(statusCode).toBe(statusCodes.ok)
  })
})
