import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { paths } from '#/config/paths.js'
import { BELL_AZURE_AD_B2C_COOKIE } from '#/server/auth/azure-ad-b2c.js'
import { config } from '#/config/config.js'
import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { formatCookieTtl } from '#/server/common/helpers/format-cookie-ttl.js'

const englishTranslations = JSON.parse(
  readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../locales/en.json'
    ),
    'utf-8'
  )
)

const cookiesContent = englishTranslations.cookies

describe('#cookiesController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should return 200 with the correct page title', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: paths.cookies
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining(`${cookiesContent.pageTitle} |`)
    )
  })

  test('Should have a link to cookies in the footer', async () => {
    const { result } = await server.inject({
      method: 'GET',
      url: paths.cookies
    })

    expect(result).toEqual(expect.stringContaining(`href="${paths.cookies}"`))
  })

  test('Should render essential cookie details from translations', async () => {
    const sessionCookieName = config.get('session.cache.name')
    const sessionCookieTtl = formatCookieTtl(config.get('session.cookie.ttl'))
    const { payload } = await server.inject({
      method: 'GET',
      url: paths.cookies
    })

    expect(payload).toContain(
      `<h1 class="govuk-heading-l">${cookiesContent.heading}</h1>`
    )
    expect(payload).toContain(cookiesContent.introParagraph)
    expect(payload).toContain(cookiesContent.introParagraph2)
    expect(payload).toContain(cookiesContent.essentialCookiesHeading)
    expect(payload).toContain(cookiesContent.essentialCookiesDescription)
    expect(payload).toContain(cookiesContent.table.essentialCookiesWeUse)
    expect(payload).toContain(sessionCookieName)
    expect(payload).toContain(BELL_AZURE_AD_B2C_COOKIE)
    expect(payload).toContain(cookiesContent.session.purpose)
    expect(payload).toContain(cookiesContent.oauthState.purpose)
    expect(payload).toContain(sessionCookieTtl)
    expect(payload).toContain(cookiesContent.oauthState.expires)

    const tableRows =
      payload
        .match(/<tbody class="govuk-table__body">[\s\S]*?<\/tbody>/g)?.[0]
        ?.match(/<tr class="govuk-table__row">/g) ?? []
    expect(tableRows).toHaveLength(2)
  })
})
