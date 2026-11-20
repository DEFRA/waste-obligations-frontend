import { vi } from 'vitest'

import { config } from '#/config/config.js'
import { load } from 'cheerio'

import { paths } from '#/config/paths.js'

import { catchAll } from './errors.js'
import { logApplicationError } from './logging/application-error.js'
import { translate } from './i18n/translate.js'
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
    expect(
      $('#main-content .govuk-grid-column-two-thirds p').eq(0).text().trim()
    ).toBe('If you typed the web address, check it is correct.')
    expect(
      $('#main-content .govuk-grid-column-two-thirds p').eq(1).text().trim()
    ).toBe(
      'If you pasted the web address, check you copied the entire address.'
    )
    expect(
      $('#main-content .govuk-grid-column-two-thirds p')
        .eq(2)
        .text()
        .replace(/\s+/g, ' ')
        .trim()
    ).toBe(
      'If the web address is correct or you selected a link or a button, email eprcustomerservice@defra.gov.uk.'
    )
    expect(
      $('#main-content .govuk-grid-column-two-thirds p').eq(2).find('a').text()
    ).toBe('eprcustomerservice@defra.gov.uk')
    expect(
      $('#main-content .govuk-grid-column-two-thirds p')
        .eq(2)
        .find('a')
        .attr('href')
    ).toBe('mailto:eprcustomerservice@defra.gov.uk')
    expect(statusCode).toBe(statusCodes.notFound)
  })
})

describe('#catchAll', () => {
  const mockErrorLogger = vi.fn()
  const mockStack = 'Mock error stack'
  const errorPage = 'error/index'
  const homeUrl = config.get('eprPackaging.homeUrl')
  const mockRequest = (statusCode, path = '/other') => ({
    path,
    method: 'get',
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
      statusCode: statusCodes.notFound,
      homeUrl
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
      statusCode: statusCodes.forbidden,
      homeUrl
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
      statusCode: statusCodes.unauthorized,
      homeUrl
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
      statusCode: statusCodes.badRequest,
      homeUrl
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
      statusCode: statusCodes.imATeapot,
      homeUrl
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.imATeapot)
  })

  test('Should log Azure AD B2C context and the error for sign-in server errors', () => {
    const request = mockRequest(
      statusCodes.internalServerError,
      paths.signInOidc
    )

    catchAll(request, mockToolkit)

    expect(request.logger.warn).toHaveBeenCalled()
    expect(mockErrorLogger).toHaveBeenCalledWith(
      { err: request.response },
      `Server error response: statusCode=500, method=GET, path=${paths.signInOidc}`
    )
  })

  describe('in a deployed environment', () => {
    beforeEach(() => {
      const actualGet = config.get.bind(config)
      vi.spyOn(config, 'get').mockImplementation((key) =>
        key === 'isProduction' ? true : actualGet(key)
      )
      mockErrorLogger.mockClear()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    test('Should log a fixed message with the error name and stack frames only', () => {
      const request = mockRequest(statusCodes.internalServerError)
      request.response.name = 'TypeError'
      request.response.stack =
        'TypeError: boom\n    at handler (/app/src/a.js:1:1)\n    at next (/app/src/b.js:2:2)'

      catchAll(request, mockToolkit)

      expect(mockErrorLogger).toHaveBeenCalledTimes(1)
      expect(mockErrorLogger).toHaveBeenCalledWith(
        {
          errorName: 'TypeError',
          stackFrames: [
            'at handler (/app/src/a.js:1:1)',
            'at next (/app/src/b.js:2:2)'
          ]
        },
        'Server error response: statusCode=500, method=GET, path=/other'
      )
    })

    test('Should log only a fixed message and no raw error for sign-in server errors', () => {
      const request = mockRequest(
        statusCodes.internalServerError,
        paths.signInOidc
      )

      catchAll(request, mockToolkit)

      expect(request.logger.warn).toHaveBeenCalled()
      expect(mockErrorLogger).toHaveBeenCalledTimes(1)
      const [context, message] = mockErrorLogger.mock.calls[0]
      expect(context).not.toHaveProperty('err')
      expect(message).toBe(
        `Server error response: statusCode=500, method=GET, path=${paths.signInOidc}`
      )
    })

    test('Should not pass the API error detail to the log', () => {
      const request = mockRequest(statusCodes.internalServerError)
      request.response.message = 'Failed for jane.doe@example.com at 1 High St'
      request.response.stack =
        'Error: jane.doe@example.com\n    at somewhere (/app/x.js:1:1)'

      catchAll(request, mockToolkit)

      const logged = JSON.stringify(mockErrorLogger.mock.calls)
      expect(logged).not.toContain('jane.doe@example.com')
      expect(logged).not.toContain('High St')
      expect(logged).toContain('at somewhere (/app/x.js:1:1)')
    })

    test('Should not log again an error that application code already logged', () => {
      const request = mockRequest(statusCodes.serviceUnavailable)
      logApplicationError(
        { error: vi.fn(), warn: vi.fn() },
        'error',
        request.response,
        'API read failed'
      )

      catchAll(request, mockToolkit)

      expect(mockErrorLogger).not.toHaveBeenCalled()
      expect(mockToolkitCode).toHaveBeenCalledWith(
        statusCodes.serviceUnavailable
      )
    })
  })

  test('Should provide expected service error page and log error for internalServerError', () => {
    const request = mockRequest(statusCodes.internalServerError)
    catchAll(request, mockToolkit)

    expect(mockErrorLogger).toHaveBeenCalledWith(
      { err: request.response },
      'Server error response: statusCode=500, method=GET, path=/other'
    )
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Sorry, there is a problem with the service',
      heading: 'Sorry, there is a problem with the service',
      message: 'Sorry, there is a problem with the service',
      statusCode: statusCodes.internalServerError,
      homeUrl
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(
      statusCodes.internalServerError
    )
  })

  test('Should reuse service error content for bad gateway responses', () => {
    const request = mockRequest(statusCodes.badGateway)
    catchAll(request, mockToolkit)

    expect(mockErrorLogger).toHaveBeenCalledWith(
      { err: request.response },
      'Server error response: statusCode=502, method=GET, path=/other'
    )
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Sorry, there is a problem with the service',
      heading: 'Sorry, there is a problem with the service',
      message: 'Sorry, there is a problem with the service',
      statusCode: statusCodes.internalServerError,
      homeUrl
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.badGateway)
  })
})

describe('service error page homepage link', () => {
  const mockToolkit = { view: vi.fn().mockReturnThis(), code: vi.fn() }
  const request = (lang) => ({
    path: '/other',
    method: 'get',
    query: lang ? { lang } : {},
    state: {},
    headers: {},
    response: { isBoom: true, output: { statusCode: 503 } },
    logger: { error: vi.fn(), warn: vi.fn() }
  })

  test('Should keep the Welsh language on the homepage link', () => {
    catchAll(request('cy'), mockToolkit)

    const { homeUrl } = mockToolkit.view.mock.calls.at(-1)[1]
    expect(new URL(homeUrl).searchParams.get('lang')).toBe('cy')
  })

  test('Should not add a language to the English homepage link', () => {
    catchAll(request(), mockToolkit)

    const { homeUrl } = mockToolkit.view.mock.calls.at(-1)[1]
    expect(homeUrl).toBe(config.get('eprPackaging.homeUrl'))
  })
})

describe('service error page Welsh content', () => {
  test('Should use the supplied Welsh heading, body and homepage sentence', () => {
    expect(translate('cy', 'errorPages.500.heading')).toBe(
      'Yn anffodus, mae problem â’r gwasanaeth'
    )
    expect(translate('cy', 'errorPages.500.body1')).toBe(
      'Rhowch gynnig arall arni rywbryd eto.'
    )
    expect(
      [
        translate('cy', 'errorPages.500.body2.prefix'),
        ' ',
        translate('cy', 'errorPages.500.body2.link'),
        '.'
      ].join('')
    ).toBe('Dychwelyd hafan.')
  })
})
