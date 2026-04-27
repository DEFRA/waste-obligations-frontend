import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { config } from '#/config/config.js'
import { vi } from 'vitest'

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  afterEach(() => {
    config.set('wasteObligationsApiBaseUrl', null)
    config.set('wasteOrganisationsApiBaseUrl', null)
    config.set('wasteApiBearerToken', null)
    config.set('wasteApiClientId', null)
    config.set('wasteApiClientSecret', null)
  })

  test('Should render query string values without API responses when config is missing', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/?organisationId=org-123&lang=cy&year=2026'
    })

    expect(result).toEqual(
      expect.stringContaining('About your certificate &amp; statement')
    )
    expect(result).toEqual(expect.stringContaining('org-123'))
    expect(result).toEqual(expect.stringContaining('cy'))
    expect(result).toEqual(expect.stringContaining('2026'))
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should read API responses and show declaration payload preview', async () => {
    config.set('wasteObligationsApiBaseUrl', 'https://waste-obligations.test')
    config.set(
      'wasteOrganisationsApiBaseUrl',
      'https://waste-organisations.test'
    )

    const fetchSpy = vi.spyOn(global, 'fetch')
    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            organisation: { id: 'abc' },
            obligations: []
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            complianceDeclarations: []
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: 'Trading name',
            referenceNumber: 'WO-123',
            address: { postcode: 'BS1 5AH' },
            regulator: 'EA'
          }),
          { status: 200 }
        )
      )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/?organisationId=11111111-1111-1111-1111-111111111111&lang=en&year=2026'
    })

    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(result).toEqual(
      expect.stringContaining('Create declaration payload preview')
    )
    expect(result).toEqual(expect.stringContaining('Trading name'))
    expect(result).toEqual(expect.stringContaining('WO-123'))
    expect(statusCode).toBe(statusCodes.ok)

    fetchSpy.mockRestore()
  })

  test('Should create a compliance declaration when requested', async () => {
    config.set('wasteObligationsApiBaseUrl', 'https://waste-obligations.test')
    config.set(
      'wasteOrganisationsApiBaseUrl',
      'https://waste-organisations.test'
    )
    config.set('wasteApiBearerToken', 'token-123')

    const fetchSpy = vi.spyOn(global, 'fetch')
    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            organisation: { id: 'abc' },
            obligations: []
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            complianceDeclarations: []
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: 'Trading name',
            referenceNumber: 'WO-123',
            address: { postcode: 'BS1 5AH' },
            regulator: 'EA'
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'cd-123',
            status: 'Submitted'
          }),
          { status: 201 }
        )
      )

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/?organisationId=11111111-1111-1111-1111-111111111111&lang=en&year=2026&createDeclaration=true'
    })

    expect(fetchSpy).toHaveBeenCalledTimes(4)
    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: 'POST',
        headers: {
          authorization: 'Bearer token-123',
          'content-type': 'application/json'
        }
      })
    )
    expect(result).toEqual(expect.stringContaining('cd-123'))
    expect(statusCode).toBe(statusCodes.ok)

    fetchSpy.mockRestore()
  })

  test('Should use basic auth when client credentials are provided', async () => {
    config.set('wasteObligationsApiBaseUrl', 'https://waste-obligations.test')
    config.set(
      'wasteOrganisationsApiBaseUrl',
      'https://waste-organisations.test'
    )
    config.set('wasteApiBearerToken', 'token-ignored')
    config.set('wasteApiClientId', 'Developer')
    config.set('wasteApiClientSecret', 'developer-pwd')

    const fetchSpy = vi.spyOn(global, 'fetch')
    fetchSpy
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            organisation: { id: 'abc' },
            obligations: []
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            complianceDeclarations: []
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: 'Trading name',
            referenceNumber: 'WO-123',
            address: { postcode: 'BS1 5AH' },
            regulator: 'EA'
          }),
          { status: 200 }
        )
      )

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/?organisationId=11111111-1111-1111-1111-111111111111&lang=en&year=2026'
    })

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      expect.any(URL),
      expect.objectContaining({
        headers: {
          authorization: 'Basic RGV2ZWxvcGVyOmRldmVsb3Blci1wd2Q='
        }
      })
    )
    expect(statusCode).toBe(statusCodes.ok)

    fetchSpy.mockRestore()
  })
})
