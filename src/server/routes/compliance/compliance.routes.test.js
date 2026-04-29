import { vi } from 'vitest'

const getOrganisationMock = vi.fn()

vi.mock('#/server/services/waste-organisations-api.service.js', () => ({
  createWasteOrganisationsApiService: () => ({
    getOrganisation: (...args) => getOrganisationMock(...args)
  })
}))

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('compliance routes', () => {
  let server
  const organisationId = 'b6f76437-65b6-4ed2-a7d5-c50e9af76201'

  beforeAll(async () => {
    getOrganisationMock.mockResolvedValue({ businessCountry: 'GB-ENG' })
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    getOrganisationMock.mockResolvedValue({ businessCountry: 'GB-ENG' })
    getOrganisationMock.mockClear()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET /compliance/{organisationId}/certificate renders page with year', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('About your certificate of compliance |')
    )
    expect(result).toEqual(expect.stringContaining('2024'))
  })

  test('GET /compliance/{organisationId}/certificate renders default regulator email', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('packaging-producers@environment-agency.gov.uk')
    )
    expect(result).toEqual(
      expect.stringContaining(
        'mailto:packaging-producers@environment-agency.gov.uk'
      )
    )
  })

  test('GET /compliance/{organisationId}/statement renders page with year', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/statement?year=2024`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('About your statement of compliance |')
    )
    expect(result).toEqual(expect.stringContaining('2024'))
  })

  test('GET /compliance/{organisationId}/statement defaults regulator email to England', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/statement?year=2024`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('packaging-producers@environment-agency.gov.uk')
    )
  })

  test('GET /compliance/{organisationId}/certificate uses businessCountry from organisation API', async () => {
    getOrganisationMock.mockResolvedValue({ businessCountry: 'GB-SCT' })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('producer.responsibility@sepa.org.uk')
    )
  })

  test('GET /compliance/{organisationId}/certificate forwards trace header to organisation API call', async () => {
    const traceId = 'trace-abc-123'

    const { statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024`,
      headers: {
        'x-cdp-request-id': traceId
      }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(getOrganisationMock).toHaveBeenCalledWith(organisationId, traceId)
  })

  test('GET /compliance/{organisationId}/certificate continues when organisation lookup fails', async () => {
    getOrganisationMock.mockRejectedValueOnce(new Error('service unavailable'))

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(getOrganisationMock).toHaveBeenCalledWith(organisationId, null)
    expect(result).toEqual(
      expect.stringContaining('packaging-producers@environment-agency.gov.uk')
    )
  })

  test('GET /compliance/{organisationId}/certificate returns 400 when organisationId is invalid', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/compliance/%20/certificate?year=2024'
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/certificate returns 400 when year is missing', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate`
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Enter a obligation year.'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/statement returns 400 when year is out of range', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/statement?year=1900`
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(
      expect.stringContaining('Year must be 2000 or later.')
    )
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/certificate falls back to English validation message when lang=cy', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?lang=cy`
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Enter a obligation year.'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test.skip('GET /compliance/{organisationId}/certificate renders Welsh content when lang=cy', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024&lang=cy`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('Ynghylch eich tystysgrif cydymffurfio |')
    )
    expect(result).toEqual(expect.stringContaining('Parhau'))
  })
})
