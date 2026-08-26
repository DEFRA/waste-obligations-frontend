import { vi } from 'vitest'
import { load } from 'cheerio'

import { paths } from '#/config/paths.js'

import { catchAll } from './errors.js'
import { createTestServer } from '#/test-helpers/create-test-server.js'
import { statusCodes } from '../constants/status-codes.js'
import { authenticate, injectAuthed } from '#/test-helpers/auth-helper.js'

describe('#errors', () => {
  let server
  let authHeaders

  beforeAll(async () => {
    server = await createTestServer()
    await server.initialize()
    authHeaders = await authenticate(server)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected Not Found page', async () => {
    const { result, statusCode } = await injectAuthed(
      server,
      {
        method: 'GET',
        url: '/non-existent-path'
      },
      authHeaders
    )

    expect(result).toEqual(
      expect.stringContaining('Page not found | Report packaging data')
    )
    const $ = load(result)
    expect($('[data-testid="app-heading-title"]').text().trim()).toBe(
      'Page not found'
    )
    expect($('.govuk-grid-column-two-thirds p').eq(0).text().trim()).toBe(
      'If you typed the web address, check it is correct.'
    )
    expect($('.govuk-grid-column-two-thirds p').eq(1).text().trim()).toBe(
      'If you pasted the web address, check you copied the entire address.'
    )
    expect(
      $('.govuk-grid-column-two-thirds p')
        .eq(2)
        .text()
        .replace(/\s+/g, ' ')
        .trim()
    ).toBe(
      'If the web address is correct or you selected a link or a button, email eprcustomerservice@defra.gov.uk.'
    )
    expect($('.govuk-grid-column-two-thirds p').eq(2).find('a').text()).toBe(
      'eprcustomerservice@defra.gov.uk'
    )
    expect(
      $('.govuk-grid-column-two-thirds p').eq(2).find('a').attr('href')
    ).toBe('mailto:eprcustomerservice@defra.gov.uk')
    expect(statusCode).toBe(statusCodes.notFound)
  })
})

describe('#catchAll', () => {
  const mockErrorLogger = vi.fn()
  const mockStack = 'Mock error stack'
  const errorPage = 'error/index'
  const mockRequest = (statusCode, path = '/other') => ({
    path,
    query: {},
    state: {},
    headers: {},
    response: {
      isBoom: true,
      message: 'Missing azure-ad-b2c request token cookie',
      stack: mockStack,
      output: {
        statusCode
      }
    },
    logger: { error: mockErrorLogger, warn: vi.fn() }
  })
  const mockToolkitView = vi.fn()
  const mockToolkitCode = vi.fn()
  const mockToolkit = {
    view: mockToolkitView.mockReturnThis(),
    code: mockToolkitCode.mockReturnThis()
  }

  test('Should continue when response is not a Boom error', () => {
    const continueSymbol = Symbol('continue')
    const toolkit = { continue: continueSymbol }
    const result = catchAll(
      {
        response: { statusCode: statusCodes.ok },
        logger: { error: mockErrorLogger, warn: vi.fn() }
      },
      toolkit
    )

    expect(result).toBe(continueSymbol)
  })

  test('Should provide expected "Not Found" page', () => {
    catchAll(mockRequest(statusCodes.notFound), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Page not found',
      heading: 'Page not found',
      message: 'Page not found',
      statusCode: statusCodes.notFound
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.notFound)
  })

  test('Should provide expected "Forbidden" page', () => {
    catchAll(mockRequest(statusCodes.forbidden), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'You do not have permission to access this page',
      heading: 'You do not have permission to access this page',
      message: 'You do not have permission to access this page',
      statusCode: statusCodes.forbidden
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.forbidden)
  })

  test('Should log a safe message for Azure AD B2C failures on sign-in', () => {
    const request = mockRequest(statusCodes.badRequest, paths.signInOidc)

    catchAll(request, mockToolkit)

    expect(request.logger.warn).toHaveBeenCalledWith(
      { err: expect.anything() },
      'Azure AD B2C authentication failed'
    )
  })

  test('Should provide expected "Unauthorized" page', () => {
    catchAll(mockRequest(statusCodes.unauthorized), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Unauthorized',
      heading: 'Unauthorized',
      message: 'Unauthorized',
      statusCode: statusCodes.unauthorized
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.unauthorized)
  })

  test('Should provide expected "Bad Request" page', () => {
    catchAll(mockRequest(statusCodes.badRequest), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Bad Request',
      heading: 'Bad Request',
      message: 'Bad Request',
      statusCode: statusCodes.badRequest
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.badRequest)
  })

  test('Should provide expected default page', () => {
    catchAll(mockRequest(statusCodes.imATeapot), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Something went wrong',
      heading: 'Something went wrong',
      message: 'Something went wrong',
      statusCode: statusCodes.imATeapot
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.imATeapot)
  })

  test('Should log Azure AD B2C context and stack for sign-in server errors', () => {
    const request = mockRequest(
      statusCodes.internalServerError,
      paths.signInOidc
    )

    catchAll(request, mockToolkit)

    expect(request.logger.warn).toHaveBeenCalled()
    expect(mockErrorLogger).toHaveBeenCalledWith(mockStack)
  })

  test('Should provide expected service error page and log error for internalServerError', () => {
    catchAll(mockRequest(statusCodes.internalServerError), mockToolkit)

    expect(mockErrorLogger).toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Sorry, there is a problem with the service',
      heading: 'Sorry, there is a problem with the service',
      message: 'Sorry, there is a problem with the service',
      statusCode: statusCodes.internalServerError
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(
      statusCodes.internalServerError
    )
  })

  test('Should reuse service error content for bad gateway responses', () => {
    catchAll(mockRequest(statusCodes.badGateway), mockToolkit)

    expect(mockErrorLogger).toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Sorry, there is a problem with the service',
      heading: 'Sorry, there is a problem with the service',
      message: 'Sorry, there is a problem with the service',
      statusCode: statusCodes.internalServerError
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.badGateway)
  })
})
