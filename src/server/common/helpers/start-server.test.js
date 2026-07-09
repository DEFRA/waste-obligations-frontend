import { vi } from 'vitest'

import { statusCodes } from '../constants/status-codes.js'

describe('#startServer', () => {
  let createServerSpy
  let startServerImport
  let createServerImport

  beforeAll(async () => {
    createServerImport = await import('../../server.js')
    startServerImport = await import('./start-server.js')

    createServerSpy = vi.spyOn(createServerImport, 'createServer')
  })

  afterAll(() => {
    createServerSpy.mockRestore()
  })

  describe('When server starts', () => {
    let server

    afterEach(async () => {
      if (server) {
        await server.stop({ timeout: 0 })
      }
    })

    test('Should start up server as expected', async () => {
      server = {
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        inject: vi.fn().mockResolvedValue({
          result: { message: 'success' },
          statusCode: statusCodes.ok
        }),
        logger: { info: vi.fn() },
        info: { uri: 'http://localhost:3000' }
      }
      createServerSpy.mockResolvedValue(server)

      const started = await startServerImport.startServer()

      expect(createServerSpy).toHaveBeenCalled()
      expect(server.start).toHaveBeenCalled()
      expect(started).toBe(server)
      expect(server.logger.info).toHaveBeenCalledWith(
        'Server started successfully'
      )

      const { result, statusCode } = await started.inject({
        method: 'GET',
        url: '/health'
      })

      expect(result).toEqual({ message: 'success' })
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('When server start fails', () => {
    test('Should log failed startup message', async () => {
      createServerSpy.mockRejectedValue(new Error('Server failed to start'))

      await expect(startServerImport.startServer()).rejects.toThrow(
        'Server failed to start'
      )
    })
  })
})
