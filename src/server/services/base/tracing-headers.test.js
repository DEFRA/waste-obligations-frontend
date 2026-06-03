import { describe, expect, test } from 'vitest'

import { buildTracingHeader } from './tracing-headers.js'

describe('buildTracingHeader', () => {
  test('returns header object when name and value are provided', () => {
    expect(buildTracingHeader('x-cdp-request-id', 'trace-abc')).toEqual({
      'x-cdp-request-id': 'trace-abc'
    })
  })

  test('returns empty object when header name is missing', () => {
    expect(buildTracingHeader(null, 'trace-abc')).toEqual({})
  })

  test('returns empty object when header value is missing', () => {
    expect(buildTracingHeader('x-cdp-request-id', null)).toEqual({})
  })
})
