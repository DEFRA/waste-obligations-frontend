import { ApiError } from '#/server/services/base/api-error.js'

/**
 * Upstream failures that must render the generic service error page.
 * Each entry is [label, () => error], so every test gets a fresh error.
 */
export const serverErrorCases = [
  ['500', () => new ApiError({ status: 500 })],
  ['502', () => new ApiError({ status: 502 })],
  ['503', () => new ApiError({ status: 503 })],
  ['504', () => new ApiError({ status: 504 })],
  [
    'timeout',
    () =>
      Object.assign(new Error('The operation timed out'), {
        name: 'TimeoutError'
      })
  ]
]
