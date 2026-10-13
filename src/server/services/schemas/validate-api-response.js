import { config } from '#/config/config.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'

const logger = createLogger()

export class ApiResponseValidationError extends Error {
  constructor(serviceName, validationMessages) {
    const message = `${serviceName} returned an unexpected response: ${validationMessages.join('; ')}`
    super(message)
    this.name = 'ApiResponseValidationError'
    this.serviceName = serviceName
    this.validationMessages = validationMessages
  }
}

export function validateApiResponse(schema, data, serviceName = 'api') {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    convert: true
  })

  if (error) {
    const validationError = new ApiResponseValidationError(
      serviceName,
      error.details.map((detail) => detail.message)
    )

    if (config.get('isProduction')) {
      logApplicationError(
        logger,
        'warn',
        validationError,
        `${serviceName} returned an unexpected response`
      )

      return data
    }

    throw validationError
  }

  return value
}
