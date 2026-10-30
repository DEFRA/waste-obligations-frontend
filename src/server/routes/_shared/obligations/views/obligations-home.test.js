import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from 'cheerio'
import { describe, expect, test } from 'vitest'

import { nunjucksConfig } from '#/config/nunjucks/nunjucks.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const templateSource = fs.readFileSync(
  path.join(dirname, 'obligations-home.njk'),
  'utf8'
)
const environment = nunjucksConfig.options.compileOptions.environment

function renderPage(overrides = {}) {
  const html = environment.renderString(templateSource, {
    locale: 'en',
    localeBase: 'obligations.home',
    isProducer: true,
    obligationYear: 2026,
    deadlineYear: 2027,
    organisationName: 'Test Organisation',
    regulatorName: 'Environment Agency',
    awaitingAcceptanceCount: 0,
    hasObligationData: true,
    acceptRejectPath: '/accept-reject',
    obligationsTableRows: [],
    glassTableRows: [],
    glassTarget: 1,
    submitCertificatePath: '/producer/submit-certificate',
    getAssetPath: (asset) => `/public/${asset}`,
    showButton: true,
    ...overrides
  })

  return load(html)
}

const normalisedText = ($element) => $element.text().replace(/\s+/g, ' ').trim()

describe('obligations home page', () => {
  test('renders the csoc tile for a producer with certificate wording', () => {
    const $ = renderPage({ isProducer: true })
    const tile = (selector) => $('.app-obligations-card').eq(1).find(selector)

    expect(tile('h3.govuk-heading-m').text().trim()).toBe(
      'Submit your certificate of compliance'
    )
    expect(normalisedText(tile('p.govuk-body'))).toContain(
      'must submit your 2026 certificate of compliance before or on 31 January 2027'
    )
    const $button = tile('a.govuk-button--secondary')
    expect($button.text().trim()).toBe('Submit your certificate')
    expect($button.attr('href')).toBe('/producer/submit-certificate')
  })

  test('renders the csoc tile for a compliance scheme with statement wording', () => {
    const $ = renderPage({ isProducer: false, complianceSchemeName: 'Scheme' })
    const tile = (selector) => $('.app-obligations-card').eq(1).find(selector)

    expect(tile('h3.govuk-heading-m').text().trim()).toBe(
      'Submit your statement of compliance'
    )
    expect(normalisedText(tile('p.govuk-body'))).toContain(
      'must submit your 2026 statement of compliance before or on 31 January 2027'
    )
    expect(tile('a.govuk-button--secondary').text().trim()).toBe(
      'Submit your statement'
    )
  })

  test('replaces the submit button with a link to the certificate once the year is submitted', () => {
    const $ = renderPage({
      isProducer: true,
      submittedDeclaration: {
        href: '/producer/org-1/compliance/certificate/certificate-1',
        buttonLabel: 'View your certificate'
      }
    })
    const tile = (selector) => $('.app-obligations-card').eq(1).find(selector)

    expect(tile('a.govuk-button')).toHaveLength(0)
    expect(tile('a.govuk-link').text().trim()).toBe('View your certificate')
    expect(tile('a.govuk-link').attr('href')).toBe(
      '/producer/org-1/compliance/certificate/certificate-1'
    )
  })

  test('replaces the submit button with the missed deadline copy after the deadline', () => {
    const $ = renderPage({
      isProducer: true,
      missedDeadline: {
        heading: 'You missed the certificate of compliance deadline',
        paragraphPrefix:
          'You missed the submission deadline of 31 January 2027.',
        paragraphSuffix: 'The Environment Agency will contact you.'
      }
    })
    const tile = (selector) => $('.app-obligations-card').eq(1).find(selector)

    expect(tile('h3.govuk-heading-m').text().trim()).toBe(
      'You missed the certificate of compliance deadline'
    )
    expect(normalisedText(tile('p.govuk-body'))).toContain(
      'The Environment Agency will contact you.'
    )
    expect(tile('a.govuk-button')).toHaveLength(0)
    expect(tile('a.govuk-link')).toHaveLength(0)
  })

  test('shows the submit button, not the missed copy, before the deadline', () => {
    const $ = renderPage({ isProducer: true, missedDeadline: null })
    const tile = (selector) => $('.app-obligations-card').eq(1).find(selector)

    expect(tile('a.govuk-button').text().trim()).toBe('Submit your certificate')
    expect(normalisedText($.root())).not.toContain('You missed')
  })

  test('replaces the submit button with the resubmit copy after the year was cancelled', () => {
    const $ = renderPage({
      isProducer: true,
      cancelledSubmission: {
        heading: 'Resubmit your certificate of compliance',
        paragraph:
          'The Environment Agency cancelled your 2026 certificate of compliance.',
        buttonLabel: 'Resubmit your certificate'
      }
    })
    const tile = (selector) => $('.app-obligations-card').eq(1).find(selector)

    expect(tile('h3.govuk-heading-m').text().trim()).toBe(
      'Resubmit your certificate of compliance'
    )
    expect(tile('a.govuk-button').text().trim()).toBe(
      'Resubmit your certificate'
    )
    expect(normalisedText($.root())).not.toContain('You missed')
  })

  test('shows the cancelled missed-deadline copy with no resubmit button once the deadline has passed', () => {
    const $ = renderPage({
      isProducer: true,
      cancelledMissedDeadline: {
        heading: 'You missed the certificate of compliance deadline',
        paragraphPrefix:
          'The Environment Agency cancelled your 2026 certificate of compliance.',
        paragraphSuffix:
          'As the deadline of 31 January 2027 has now passed, you can no longer resubmit your certificate.'
      }
    })
    const tile = (selector) => $('.app-obligations-card').eq(1).find(selector)

    expect(tile('h3.govuk-heading-m').text().trim()).toBe(
      'You missed the certificate of compliance deadline'
    )
    expect(normalisedText(tile('p.govuk-body'))).toContain(
      'you can no longer resubmit your certificate.'
    )
    expect(tile('a.govuk-button')).toHaveLength(0)
    expect(tile('a.govuk-link')).toHaveLength(0)
  })

  test('hides the csoc tile when there is no obligation data yet', () => {
    const $ = renderPage({ hasObligationData: false })

    expect($('.csoc-tile')).toHaveLength(0)
    expect($('.app-obligations-card')).toHaveLength(1)
  })

  test('hides the csoc tile button for a user who is not an approved user', () => {
    const $ = renderPage({ isProducer: true, showButton: false })
    const tile = (selector) => $('.app-obligations-card').eq(1).find(selector)

    expect(tile('h3.govuk-heading-m').text().trim()).toBe(
      'Submit your certificate of compliance'
    )
    expect(tile('a.govuk-button')).toHaveLength(0)
  })
})
