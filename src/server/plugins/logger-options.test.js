import { describe, test, expect, vi, beforeEach } from 'vitest'

const getTraceId = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId
}))

vi.mock('@elastic/ecs-pino-format', () => ({
  ecsFormat: vi.fn(() => ({ ecsFormatter: true }))
}))

vi.mock('#/config/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'log') {
        return {
          enabled: true,
          redact: [],
          level: 'info',
          format: 'ecs'
        }
      }
      if (key === 'serviceName') {
        return 'waste-obligations-frontend'
      }
      if (key === 'serviceVersion') {
        return '9.9.9'
      }
      return undefined
    })
  }
}))

import { loggerOptions } from './logger-options.js'

describe('logger-options', () => {
  beforeEach(() => {
    getTraceId.mockReset()
  })

  test('mixin adds trace id when getTraceId returns a value', () => {
    getTraceId.mockReturnValue('cdp-trace-abc')
    expect(loggerOptions.mixin()).toEqual({ trace: { id: 'cdp-trace-abc' } })
  })

  test('mixin returns empty object when getTraceId is falsy', () => {
    getTraceId.mockReturnValue(null)
    expect(loggerOptions.mixin()).toEqual({})
  })
})
