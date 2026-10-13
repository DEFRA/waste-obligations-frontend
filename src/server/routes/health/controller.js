import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  createDependencyHealthCheckOptions,
  runDependencyHealthChecks
} from './dependency-health-checks.js'

/**
 * A generic health-check endpoint. Used by the platform to check if the service is up and handling requests.
 */
export const healthController = {
  handler(_request, h) {
    return h.response({ message: 'success' }).code(statusCodes.ok)
  }
}

export const healthAllController = {
  async handler(request, h) {
    const report = await runDependencyHealthChecks(
      createDependencyHealthCheckOptions(request.server)
    )
    const statusCode =
      report.status === 'Healthy'
        ? statusCodes.ok
        : statusCodes.serviceUnavailable

    return h
      .response(report)
      .code(statusCode)
      .header('Cache-Control', 'no-store')
  }
}
