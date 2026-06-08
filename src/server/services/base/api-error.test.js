import { describe, expect, test } from 'vitest'
import { ApiError } from './api-error.js'

describe('ApiError', () => {
  test('from maps problem+json fields', () => {
    const error = ApiError.from({
      message: 'waste-organisations API request failed with status 500',
      status: 500,
      body: {
        type: 'https://tools.ietf.org/html/rfc9110#section-15.6.1',
        title: 'Internal Server Error',
        detail: 'upstream failed',
        instance: '/organisations/org-1',
        traceId: 'trace-500',
        errors: [{ code: 'ERR_500' }]
      }
    })

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      name: 'ApiError',
      status: 500,
      title: 'Internal Server Error',
      detail: 'upstream failed',
      instance: '/organisations/org-1',
      traceId: 'trace-500',
      errors: [{ code: 'ERR_500' }]
    })
  })

  test('uses detail as message when message is omitted', () => {
    const error = new ApiError({ status: 404, detail: 'not found' })

    expect(error.message).toBe('not found')
  })

  test('uses title as message when message and detail are omitted', () => {
    const error = new ApiError({ status: 404, title: 'Not Found' })

    expect(error.message).toBe('Not Found')
  })

  test('falls back to status message when message, detail and title are omitted', () => {
    const error = new ApiError({ status: 404 })

    expect(error.message).toBe('API request failed with status 404')
  })
})
