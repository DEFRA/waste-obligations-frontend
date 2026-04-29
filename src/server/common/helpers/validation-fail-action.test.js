import { describe, expect, test, vi } from 'vitest'
import { statusCodes } from '../constants/status-codes.js'
import { renderValidationFailAction } from './validation-fail-action.js'

describe('renderValidationFailAction', () => {
  test('renders bad request page with joi details', () => {
    const mockView = vi.fn().mockReturnThis()
    const mockCode = vi.fn().mockReturnThis()
    const mockTakeover = vi.fn().mockReturnThis()
    const h = {
      view: mockView,
      code: mockCode,
      takeover: mockTakeover
    }

    const error = {
      details: [{ message: '"year" is required' }]
    }

    renderValidationFailAction({}, h, error)

    expect(mockView).toHaveBeenCalledWith('error/index', {
      pageTitle: 'Bad Request',
      heading: statusCodes.badRequest,
      message: '"year" is required'
    })
    expect(mockCode).toHaveBeenCalledWith(statusCodes.badRequest)
    expect(mockTakeover).toHaveBeenCalled()
  })
})
