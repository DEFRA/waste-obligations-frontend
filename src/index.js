import process from 'node:process'

import { startServer } from '#/server/common/helpers/start-server.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'
import { logDownstreamRequests } from '#/server/common/helpers/logging/downstream-requests.js'

logDownstreamRequests(createLogger())
await startServer()

process.on('unhandledRejection', (error) => {
  const logger = createLogger()
  logger.info('Unhandled rejection')
  logger.error(error)
  process.exitCode = 1
})
