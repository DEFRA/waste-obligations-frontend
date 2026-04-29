import { describe, expect, test, vi } from 'vitest'
import { statusCodes } from '../constants/status-codes.js'
import { renderValidationFailAction } from './validation-fail-action.js'

describe('renderValidationFailAction', () => {
  test('renders translated error key for english locale', () => {
    const mockView = vi.fn().mockReturnThis()
    const mockCode = vi.fn().mockReturnThis()
    const mockTakeover = vi.fn().mockReturnThis()
    const h = {
      view: mockView,
      code: mockCode,
      takeover: mockTakeover
    }

    const error = {
      details: [{ message: 'compliance.validation.year.required' }]
    }

    renderValidationFailAction({ query: { lang: 'en' } }, h, error)

    expect(mockView).toHaveBeenCalledWith('error/index', {
      pageTitle: 'Bad Request',
      heading: statusCodes.badRequest,
      message: 'Enter a reporting year.'
    })
    expect(mockCode).toHaveBeenCalledWith(statusCodes.badRequest)
    expect(mockTakeover).toHaveBeenCalled()
  })

  test('falls back to english when welsh key is unavailable', () => {
    const mockView = vi.fn().mockReturnThis()
    const mockCode = vi.fn().mockReturnThis()
    const mockTakeover = vi.fn().mockReturnThis()
    const h = {
      view: mockView,
      code: mockCode,
      takeover: mockTakeover
    }

    const error = {
      details: [{ message: 'compliance.validation.year.required' }]
    }

    renderValidationFailAction({ query: { lang: 'cy' } }, h, error)

    expect(mockView).toHaveBeenCalledWith('error/index', {
      pageTitle: 'Bad Request',
      heading: statusCodes.badRequest,
      message: 'Enter a reporting year.'
    })
  })

  test('falls back to generic bad request when details and message are empty', () => {
    const mockView = vi.fn().mockReturnThis()
    const mockCode = vi.fn().mockReturnThis()
    const mockTakeover = vi.fn().mockReturnThis()
    const h = {
      view: mockView,
      code: mockCode,
      takeover: mockTakeover
    }

    renderValidationFailAction({ query: { lang: 'en' } }, h, {
      details: [{ message: null }],
      message: ''
    })

    expect(mockView).toHaveBeenCalledWith('error/index', {
      pageTitle: 'Bad Request',
      heading: statusCodes.badRequest,
      message: 'Bad Request'
    })
    expect(mockCode).toHaveBeenCalledWith(statusCodes.badRequest)
    expect(mockTakeover).toHaveBeenCalled()
  })
})
