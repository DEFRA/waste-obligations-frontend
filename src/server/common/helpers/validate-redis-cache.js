export class RedisCacheValidationError extends Error {
  constructor(cacheLabel, validationMessages) {
    const message = `${cacheLabel} cache payload is invalid: ${validationMessages.join('; ')}`
    super(message)
    this.name = 'RedisCacheValidationError'
    this.cacheLabel = cacheLabel
    this.validationMessages = validationMessages
  }
}

export function validateRedisCache(schema, data, cacheLabel = 'redis-cache') {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    convert: true
  })

  if (error) {
    throw new RedisCacheValidationError(
      cacheLabel,
      error.details.map((detail) => detail.message)
    )
  }

  return value
}
