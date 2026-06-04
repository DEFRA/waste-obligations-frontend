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
    throw new ApiResponseValidationError(
      serviceName,
      error.details.map((detail) => detail.message)
    )
  }

  return value
}
