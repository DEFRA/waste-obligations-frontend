export class ApiRequestValidationError extends Error {
  constructor(serviceName, validationMessages) {
    const message = `${serviceName} request payload is invalid: ${validationMessages.join('; ')}`
    super(message)
    this.name = 'ApiRequestValidationError'
    this.serviceName = serviceName
    this.validationMessages = validationMessages
  }
}

export function validateApiRequest(schema, data, serviceName = 'api') {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    convert: true
  })

  if (error) {
    throw new ApiRequestValidationError(
      serviceName,
      error.details.map((detail) => detail.message)
    )
  }

  return value
}
