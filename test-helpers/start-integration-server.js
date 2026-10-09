import { createServer } from '#/server/server.js'
import { logClockOverride } from '#/server/common/helpers/clock.js'
import { integrationMockAzureAdB2cAuth } from '#/test-helpers/integration-mock-azure-ad-b2c-auth-plugin.js'

const server = await createServer({
  authPlugin: integrationMockAzureAdB2cAuth
})

await server.start()

server.logger.info('Server started successfully')
server.logger.info(`Access your frontend on ${server.info.uri}`)
logClockOverride(server.logger)
