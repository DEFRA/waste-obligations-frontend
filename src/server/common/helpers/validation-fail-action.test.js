import { describe, expect, test, vi } from 'vitest'
import { statusCodes } from '../constants/status-codes.js'
import { renderValidationFailAction } from './validation-fail-action.js'

describe('renderValidationFailAction', () => {
  test('renders bad request message', () => {
    const mockView = vi.fn().mockReturnThis()
    const mockCode = vi.fn().mockReturnThis()
    const mockTakeover = vi.fn().mockReturnThis()
    const h = {
      view: mockView,
      code: mockCode,
      takeover: mockTakeover
    }

    renderValidationFailAction({ query: { lang: 'en' } }, h, {
      details: [{ message: 'ignored detail' }]
    })

    expect(mockView).toHaveBeenCalledWith('error/index', {
      pageTitle: 'Bad Request',
      heading: statusCodes.badRequest,
      message: 'Bad Request'
    })
    expect(mockCode).toHaveBeenCalledWith(statusCodes.badRequest)
    expect(mockTakeover).toHaveBeenCalled()
  })

  test('ignores locale and still renders bad request message', () => {
    const mockView = vi.fn().mockReturnThis()
    const mockCode = vi.fn().mockReturnThis()
    const mockTakeover = vi.fn().mockReturnThis()
    const h = {
      view: mockView,
      code: mockCode,
      takeover: mockTakeover
    }

    renderValidationFailAction({ query: { lang: 'cy' } }, h, {
      details: [{ message: 'ignored detail' }]
    })

    expect(mockView).toHaveBeenCalledWith('error/index', {
      pageTitle: 'Bad Request',
      heading: statusCodes.badRequest,
      message: 'Bad Request'
    })
  })

  test('renders bad request when details and message are empty', () => {
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
