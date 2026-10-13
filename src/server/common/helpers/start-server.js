import { createServer } from '../../server.js'
import { logClockOverride } from './clock.js'

async function startServer() {
  const server = await createServer()
  await server.start()

  server.logger.info('Server started successfully')
  server.logger.info(`Access your frontend on ${server.info.uri}`)

  logClockOverride(server.logger)

  return server
}

export { startServer }
