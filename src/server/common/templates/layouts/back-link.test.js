import { load } from 'cheerio'

import { createTestServer } from '#/test-helpers/create-test-server.js'
import { authenticate, injectAuthed } from '#/test-helpers/auth-helper.js'

describe('back link through the real server', () => {
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

  test('a page that sets no backLink falls back to the context back link', async () => {
    const { result } = await injectAuthed(
      server,
      { method: 'GET', url: '/cookies' },
      authHeaders
    )
    const $ = load(result)

    expect($('a.govuk-back-link')).toHaveLength(1)
    expect($('a.govuk-back-link').attr('href')).toBeTruthy()
  })

  test('the not found page shows no back link but keeps the language links', async () => {
    const { result, statusCode } = await injectAuthed(
      server,
      { method: 'GET', url: '/non-existent-path' },
      authHeaders
    )
    const $ = load(result)

    expect(statusCode).toBe(404)
    expect($('a.govuk-back-link')).toHaveLength(0)
    expect($('.language-toggle')).toHaveLength(1)
  })
})
