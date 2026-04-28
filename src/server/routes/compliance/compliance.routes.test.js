import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('compliance routes', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET /compliance/{organisationId}/certificate renders page with year', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/compliance/abc123/certificate?year=2024'
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
      url: '/compliance/abc123/certificate?year=2024'
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
      url: '/compliance/abc123/statement?year=2024'
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
      url: '/compliance/abc123/statement?year=2024'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('packaging-producers@environment-agency.gov.uk')
    )
  })
})
