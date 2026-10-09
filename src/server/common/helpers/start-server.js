import { createServer } from '../../server.js'
import { isClockOverridden, now } from './clock.js'

async function startServer() {
  const server = await createServer()
  await server.start()

  server.logger.info('Server started successfully')
  server.logger.info(`Access your frontend on ${server.info.uri}`)

  if (isClockOverridden) {
    server.logger.warn(
      `STARTUP_UTC_TIMESTAMP_OVERRIDE is set: date-dependent UI logic is running at ${now().toISOString()}`
    )
  }

  return server
}

export { startServer }
