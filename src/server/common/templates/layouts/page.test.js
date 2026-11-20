import fs from 'node:fs'
import path from 'node:path'

import { load } from 'cheerio'
import { describe, expect, test } from 'vitest'

import { nunjucksConfig } from '#/config/nunjucks/nunjucks.js'

const environment = nunjucksConfig.options.compileOptions.environment
const sourceRoot = path.join(process.cwd(), 'src/server')

function render(viewPath, context = {}) {
  const source = fs.readFileSync(path.join(sourceRoot, viewPath), 'utf8')
  const html = environment.renderString(source, {
    locale: 'en',
    backLink: '/previous-page',
    languageSwitcher: { en: '/en', cy: '/cy' },
    eprPackaging: { homeUrl: '/home', feedbackUrl: '/feedback' },
    getAssetPath: (asset) => `/public/${asset}`,
    ...context
  })

  return load(html)
}

const prn = {
  type: 'PRN',
  tonnage: 10,
  material: 'Plastic',
  status: 'AWAITING_ACCEPTANCE'
}

const pagesWithBackLink = [
  ['PRN awaiting acceptance', 'routes/_shared/prns/views/prn.njk', { prn }],
  [
    'PRN not yet confirmed',
    'routes/_shared/prns/views/prn.njk',
    { prn, isAcceptanceConfirmation: false, isRejectionConfirmation: false }
  ],
  ['cookies page', 'routes/cookies/index.njk', {}]
]

const pagesWithoutBackLink = [
  [
    'PRN accepted confirmation',
    'routes/_shared/prns/views/prn.njk',
    { prn, isAcceptanceConfirmation: true }
  ],
  [
    'PRN rejection confirmation',
    'routes/_shared/prns/views/prn.njk',
    { prn, isRejectionConfirmation: true }
  ],
  [
    'multi-select accepted confirmation',
    'routes/_shared/prns/views/prns-accepted-selection.njk',
    { count: 3, year: 2026 }
  ],
  [
    'compliance success',
    'common/templates/compliance/compliance-success.njk',
    { localeBase: 'compliance.certificateSuccess', year: 2026 }
  ],
  [
    'error page',
    'routes/error/index.njk',
    { statusCode: 500, heading: 'Error' }
  ],
  [
    'not found page',
    'routes/error/index.njk',
    { statusCode: 404, heading: 'Not found' }
  ],
  ['signed-out page', 'routes/auth/signed-out/index.njk', {}]
]

describe('page layout back link', () => {
  test.each(pagesWithBackLink)(
    '%s shows the back link',
    (_name, view, context) => {
      const $ = render(view, context)

      expect($('a.govuk-back-link').attr('href')).toBe('/previous-page')
      expect($('a.govuk-back-link').text().trim()).toBe('Back')
    }
  )

  test.each(pagesWithoutBackLink)(
    '%s shows no back link',
    (_name, view, context) => {
      const $ = render(view, context)

      expect($('a.govuk-back-link')).toHaveLength(0)
      expect($('nav[aria-label="Back"]')).toHaveLength(0)
    }
  )

  test('keeps the language switcher on a page without a back link', () => {
    const $ = render('routes/auth/signed-out/index.njk')

    expect($('.language-toggle')).toHaveLength(1)
  })

  test('shows the Welsh back link text when Cymraeg is chosen', () => {
    const $ = render('routes/_shared/prns/views/prn.njk', { prn, locale: 'cy' })

    expect($('a.govuk-back-link').text().trim()).toBe('Yn ôl')
  })

  test('puts the back link before the language links so keyboard order matches the screen', () => {
    const $ = render('routes/_shared/prns/views/prn.njk', { prn })
    const navs = $('.app-subheader nav')
      .map((_, el) => $(el).attr('aria-label'))
      .get()

    expect(navs).toEqual(['Back', 'Language'])
  })
})
