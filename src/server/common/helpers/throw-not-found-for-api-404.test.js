import Boom from '@hapi/boom'
import { describe, expect, test } from 'vitest'

import { ApiError } from '#/server/services/base/api-error.js'
import { throwNotFoundForApi404 } from './throw-not-found-for-api-404.js'

describe('throwNotFoundForApi404', () => {
  test('throws Boom not found for an API 404', () => {
    expect(() => throwNotFoundForApi404(new ApiError({ status: 404 }))).toThrow(
      Boom.notFound()
    )
  })

  test('does nothing for other API errors', () => {
    expect(() =>
      throwNotFoundForApi404(new ApiError({ status: 502 }))
    ).not.toThrow()
  })

  test('does nothing for errors that are not API errors', () => {
    expect(() => throwNotFoundForApi404(new Error('boom'))).not.toThrow()
  })
})
