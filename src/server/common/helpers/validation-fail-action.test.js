import Boom from '@hapi/boom'
import { describe, expect, test, vi } from 'vitest'
import { statusCodes } from '../constants/status-codes.js'
import { renderValidationFailAction } from './validation-fail-action.js'

describe('renderValidationFailAction', () => {
  test('throws not found when a path parameter fails validation', () => {
    const h = { view: vi.fn() }
    const error = {
      output: { payload: { validation: { source: 'params', keys: ['id'] } } }
    }

    let thrown
    try {
      renderValidationFailAction({ query: { lang: 'en' } }, h, error)
    } catch (caught) {
      thrown = caught
    }

    expect(Boom.isBoom(thrown)).toBe(true)
    expect(thrown.output.statusCode).toBe(statusCodes.notFound)
    expect(h.view).not.toHaveBeenCalled()
  })

  test.each([
    ['no error', undefined],
    ['an error with no output', {}],
    ['an error with no validation details', { output: { payload: {} } }]
  ])('renders bad request when given %s', (_, error) => {
    const mockView = vi.fn().mockReturnThis()
    const mockCode = vi.fn().mockReturnThis()
    const mockTakeover = vi.fn().mockReturnThis()
    const h = { view: mockView, code: mockCode, takeover: mockTakeover }

    renderValidationFailAction({ query: { lang: 'en' } }, h, error)

    expect(mockCode).toHaveBeenCalledWith(statusCodes.badRequest)
    expect(mockTakeover).toHaveBeenCalled()
  })

  test('renders bad request when a query value fails validation', () => {
    const mockView = vi.fn().mockReturnThis()
    const mockCode = vi.fn().mockReturnThis()
    const mockTakeover = vi.fn().mockReturnThis()
    const h = { view: mockView, code: mockCode, takeover: mockTakeover }
    const error = {
      output: { payload: { validation: { source: 'query', keys: ['year'] } } }
    }

    renderValidationFailAction({ query: { lang: 'en' } }, h, error)

    expect(mockCode).toHaveBeenCalledWith(statusCodes.badRequest)
    expect(mockTakeover).toHaveBeenCalled()
  })

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
      heading: 'Bad Request',
      message: 'Bad Request',
      statusCode: statusCodes.badRequest
    })
    expect(mockCode).toHaveBeenCalledWith(statusCodes.badRequest)
    expect(mockTakeover).toHaveBeenCalled()
  })

  test('uses locale for bad request message', () => {
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
      pageTitle: 'Cais Drwg',
      heading: 'Cais Drwg',
      message: 'Cais Drwg',
      statusCode: statusCodes.badRequest
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
      heading: 'Bad Request',
      message: 'Bad Request',
      statusCode: statusCodes.badRequest
    })
    expect(mockCode).toHaveBeenCalledWith(statusCodes.badRequest)
    expect(mockTakeover).toHaveBeenCalled()
  })
})
