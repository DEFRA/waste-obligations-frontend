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

  test('GET /compliance/{organisationId}/certificate returns 404 when organisation is not found', async () => {
    getOrganisationMock.mockRejectedValueOnce({ status: statusCodes.notFound })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?year=2024`
    })

    expect(statusCode).toBe(statusCodes.notFound)
    expect(result).toEqual(
      expect.stringContaining('Page not found | Report packaging data')
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
    expect(result).toEqual(expect.stringContaining('Bad Request'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/statement returns 400 when year is out of range', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/statement?year=1900`
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/certificate returns bad request when lang=cy', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate?lang=cy`
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
    expect(getOrganisationMock).not.toHaveBeenCalled()
  })

  test('GET /compliance/{organisationId}/certificate/submit renders submit page with year', async () => {
    getOrganisationMock.mockResolvedValue({
      businessCountry: 'GB-ENG',
      name: 'Petrie and Tew Limited',
      organisationId: '123 456',
      address: 'Pikash Lane, Keynsham, Bristol, BS31 1TP'
    })

    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate/submit?year=2026`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining(
        'Check and submit your 2026 certificate of compliance'
      )
    )
    expect(result).toEqual(expect.stringContaining('Petrie and Tew Limited'))
    expect(result).toEqual(
      expect.stringContaining('Recycling obligations have been met')
    )
  })

  test('GET /compliance/{organisationId}/certificate/submit supports mock not_met design', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/compliance/${organisationId}/certificate/submit?year=2026&mock=not_met`
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('Recycling obligations have not been met')
    )
    expect(result).toEqual(expect.stringContaining('Not met'))
  })

  test('POST /compliance/{organisationId}/certificate/submit redirects to success', async () => {
    const { headers, statusCode } = await server.inject({
      method: 'POST',
      url: `/compliance/${organisationId}/certificate/submit?year=2026`,
      payload: { fullName: 'Jane Doe' }
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toBe(
      `/compliance/${organisationId}/certificate/success?year=2026&status=met`
    )
  })

  test('POST /compliance/{organisationId}/certificate/submit uses not_met status when mock=not_met', async () => {
    const { headers, statusCode } = await server.inject({
      method: 'POST',
      url: `/compliance/${organisationId}/certificate/submit?year=2025&mock=not_met`,
      payload: { fullName: 'Jane Doe' }
    })

    expect(statusCode).toBe(302)
    expect(headers.location).toBe(
      `/compliance/${organisationId}/certificate/success?year=2025&status=not_met`
    )
  })

  test('POST /compliance/{organisationId}/certificate/submit returns 400 when fullName missing', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: `/compliance/${organisationId}/certificate/submit?year=2026`,
      payload: { fullName: '' }
    })

    expect(statusCode).toBe(statusCodes.badRequest)
    expect(result).toEqual(expect.stringContaining('Bad Request'))
  })
})
