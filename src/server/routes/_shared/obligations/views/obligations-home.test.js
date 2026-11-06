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
    showLink: true,
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
      'must submit your 2026 certificate of compliance on or before 31 January 2027'
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
      'must submit your 2026 statement of compliance on or before 31 January 2027'
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
    expect(tile('a.govuk-link').text().trim()).toBe(
      'View your certificate of compliance'
    )
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

  test('shows the alternative how-to-meet content when obligations are not calculated', () => {
    const $ = renderPage({
      showAlternativeHowToMeet: true,
      dataYear: 2025
    })
    const section = $('#how-to-meet-heading').parent()

    expect(section.hasClass('meeting-obligations__alt-content')).toBe(true)
    expect($('#how-to-meet-heading').hasClass('govuk-!-margin-bottom-0')).toBe(
      false
    )
    expect(section.text()).toContain('you submit your packaging data for 2025')
  })

  test('shows the regular how-to-meet content when obligations are calculated', () => {
    const $ = renderPage({ showAlternativeHowToMeet: false })
    const section = $('#how-to-meet-heading').parent()

    expect(section.hasClass('meeting-obligations__alt-content')).toBe(false)
    expect($('#how-to-meet-heading').hasClass('govuk-!-margin-bottom-0')).toBe(
      true
    )
    expect(section.text()).not.toContain('have not been calculated yet')
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

const ORGANISATIONS = [
  {
    label: 'producer',
    isProducer: true,
    submit: {
      heading: 'Submit your certificate of compliance',
      paragraph:
        'must submit your 2026 certificate of compliance on or before 31 January 2027',
      button: 'Submit your certificate',
      path: '/producer/org-1/compliance/certificate/submit?year=2026'
    },
    submitted: {
      link: 'View your certificate of compliance',
      href: '/producer/org-1/compliance/certificate/certificate-1',
      heading: 'View your certificate of compliance',
      paragraph: 'Your 2026 certificate of compliance has been submitted.'
    },
    cancelled: {
      heading: 'Resubmit your certificate of compliance',
      paragraph:
        'The Environment Agency cancelled your 2026 certificate of compliance. An approved or delegated person must resubmit it on or before 31 January 2027.',
      buttonLabel: 'Resubmit your certificate'
    },
    missed: {
      heading: 'You missed the certificate of compliance deadline',
      paragraphPrefix:
        'You missed the submission deadline of 31 January 2027. You can no longer submit your 2026 certificate of compliance.',
      paragraphSuffix: 'The Environment Agency will contact you.'
    },
    cancelledMissed: {
      heading: 'You missed the certificate of compliance deadline',
      paragraphPrefix:
        'The Environment Agency cancelled your 2026 certificate of compliance.',
      paragraphSuffix:
        'As the deadline of 31 January 2027 has now passed, you can no longer resubmit your certificate.'
    }
  },
  {
    label: 'compliance scheme',
    isProducer: false,
    submit: {
      heading: 'Submit your statement of compliance',
      paragraph:
        'must submit your 2026 statement of compliance on or before 31 January 2027',
      button: 'Submit your statement',
      path: '/cso/scheme-1/compliance/statement/submit?year=2026'
    },
    submitted: {
      link: 'View your statement of compliance',
      href: '/cso/scheme-1/compliance/statement/statement-1',
      heading: 'View your statement of compliance',
      paragraph: 'Your 2026 statement of compliance has been submitted.'
    },
    cancelled: {
      heading: 'Resubmit your statement of compliance',
      paragraph:
        'The Environment Agency cancelled your 2026 statement of compliance. An approved or delegated person must resubmit it on or before 31 January 2027.',
      buttonLabel: 'Resubmit your statement'
    },
    missed: {
      heading: 'You missed the statement of compliance deadline',
      paragraphPrefix:
        'You missed the submission deadline of 31 January 2027. You can no longer submit your 2026 statement of compliance.',
      paragraphSuffix: 'The Environment Agency will contact you.'
    },
    cancelledMissed: {
      heading: 'You missed the statement of compliance deadline',
      paragraphPrefix:
        'The Environment Agency cancelled your 2026 statement of compliance.',
      paragraphSuffix:
        'As the deadline of 31 January 2027 has now passed, you can no longer resubmit your statement.'
    }
  }
]

// The template does not tell approved and delegated people apart, so both
// render from the same flag. Basic users see the tile without its buttons.
const ROLES = [
  { label: 'approved person', showButton: true, showLink: true },
  { label: 'delegated person', showButton: true, showLink: true },
  { label: 'basic user', showButton: false, showLink: true }
]

describe.each(ORGANISATIONS)(
  'CSoC tile states for a $label',
  (organisation) => {
    describe.each(ROLES)('for a $label', (role) => {
      const render = (overrides = {}) =>
        renderPage({
          isProducer: organisation.isProducer,
          complianceSchemeName: 'Scheme',
          showButton: role.showButton,
          showLink: role.showLink,
          submitCertificatePath: organisation.submit.path,
          ...overrides
        })
      const csocCard = ($) => $('.app-obligations-card').eq(1)

      function expectNoButton($) {
        expect(csocCard($).find('a.govuk-button')).toHaveLength(0)
      }

      test('before the deadline with no submission, shows the submit tile', () => {
        const $ = render({ missedDeadline: null })
        const card = csocCard($)

        expect(card.find('h3.govuk-heading-m').text().trim()).toBe(
          organisation.submit.heading
        )
        expect(normalisedText(card.find('p.govuk-body'))).toContain(
          organisation.submit.paragraph
        )
        expect(card.find('a.govuk-link')).toHaveLength(0)
        expect(normalisedText($.root())).not.toContain('You missed')

        if (role.showButton) {
          const button = card.find('a.govuk-button')
          expect(button.text().trim()).toBe(organisation.submit.button)
          expect(button.attr('href')).toBe(organisation.submit.path)
        } else {
          expectNoButton($)
        }
      })

      test('after submitting, shows the submitted tile with a link and no submit button', () => {
        const $ = render({
          submittedDeclaration: {
            heading: organisation.submitted.heading,
            paragraphPrefix: organisation.submitted.paragraph,
            href: organisation.submitted.href
          }
        })
        const card = csocCard($)

        expect(card.find('h3.govuk-heading-m').text().trim()).toBe(
          organisation.submitted.heading
        )
        expect(card.find('a.govuk-link').text().trim()).toBe(
          organisation.submitted.link
        )
        expect(card.find('a.govuk-link').attr('href')).toBe(
          organisation.submitted.href
        )
        expectNoButton($)
        expect(normalisedText($.root())).not.toContain('You missed')
      })

      test('after a regulator cancellation before the deadline, shows the resubmit tile', () => {
        const $ = render({ cancelledSubmission: organisation.cancelled })
        const card = csocCard($)

        expect(card.find('h3.govuk-heading-m').text().trim()).toBe(
          organisation.cancelled.heading
        )
        expect(normalisedText(card.find('p.govuk-body'))).toContain(
          organisation.cancelled.paragraph
        )
        expect(card.find('a.govuk-link')).toHaveLength(0)

        if (role.showButton) {
          const button = card.find('a.govuk-button')
          expect(button.text().trim()).toBe(organisation.cancelled.buttonLabel)
          expect(button.attr('href')).toBe(organisation.submit.path)
        } else {
          expectNoButton($)
        }
      })

      test('after the deadline with no submission, shows the missed-deadline tile with no button or link', () => {
        const $ = render({ missedDeadline: organisation.missed })
        const card = csocCard($)

        expect(card.find('h3.govuk-heading-m').text().trim()).toBe(
          organisation.missed.heading
        )
        expect(normalisedText(card.find('p.govuk-body'))).toContain(
          organisation.missed.paragraphSuffix
        )
        expectNoButton($)
        expect(card.find('a.govuk-link')).toHaveLength(0)
      })

      test('after the deadline with a regulator cancellation, shows the no-resubmit tile with no button or link', () => {
        const $ = render({
          cancelledMissedDeadline: organisation.cancelledMissed
        })
        const card = csocCard($)

        expect(card.find('h3.govuk-heading-m').text().trim()).toBe(
          organisation.cancelledMissed.heading
        )
        expect(normalisedText(card.find('p.govuk-body'))).toContain(
          organisation.cancelledMissed.paragraphSuffix
        )
        expectNoButton($)
        expect(card.find('a.govuk-link')).toHaveLength(0)
      })

      test('with no obligation data yet, shows no CSoC tile', () => {
        const $ = render({ hasObligationData: false })

        expect($('.csoc-tile')).toHaveLength(0)
        expect($('.app-obligations-card')).toHaveLength(1)
      })
    })
  }
)
