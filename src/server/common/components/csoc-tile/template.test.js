import { renderComponent } from '#/test-helpers/component-helpers.js'

describe('CSoC tile component', () => {
  const params = {
    type: 'submit',
    heading: 'Submit your statement of compliance',
    paragraphPrefix: 'You must submit your statement of compliance by',
    deadlineDate: '31 May 2027',
    buttonLabel: 'Submit your statement',
    submitPath: '/producer/compliance/submit',
    showButton: true
  }

  let $tile

  beforeEach(() => {
    $tile = renderComponent(
      'csoc-tile',
      params,
      undefined,
      undefined,
      'csocTile'
    )
  })

  test('Should render the submit heading as a medium heading', () => {
    expect($tile('h3.govuk-heading-m').text().trim()).toBe(
      'Submit your statement of compliance'
    )
  })

  test('Should render the paragraph prefix with the deadline in bold', () => {
    const $paragraph = $tile('p.govuk-body')

    expect($paragraph.text().replace(/\s+/g, ' ').trim()).toBe(
      'You must submit your statement of compliance by 31 May 2027'
    )
  })

  test('Should render a secondary button with the submit label and path', () => {
    const $button = $tile('a.govuk-button')

    expect($button).toHaveLength(1)
    expect($button.hasClass('govuk-button--secondary')).toBe(true)
    expect($button.text().trim()).toBe('Submit your statement')
    expect($button.attr('href')).toBe('/producer/compliance/submit')
  })

  describe('showButton', () => {
    const render = (overrides) =>
      renderComponent(
        'csoc-tile',
        { ...params, ...overrides },
        undefined,
        undefined,
        'csocTile'
      )

    test('Should render the submit button when showButton is true', () => {
      const $ = render({ showButton: true })

      expect($('a.govuk-button')).toHaveLength(1)
      expect($('a.govuk-button').text().trim()).toBe('Submit your statement')
    })

    test('Should not render the submit button when showButton is false', () => {
      const $ = render({ showButton: false })

      expect($('a.govuk-button')).toHaveLength(0)
      expect($('h3.govuk-heading-m').text().trim()).toBe(
        'Submit your statement of compliance'
      )
      expect($('p.govuk-body').text().replace(/\s+/g, ' ').trim()).toBe(
        'You must submit your statement of compliance by 31 May 2027'
      )
    })

    test('Should not render the submit button when showButton is omitted', () => {
      const { showButton: _omitted, ...withoutFlag } = params
      const $ = renderComponent(
        'csoc-tile',
        withoutFlag,
        undefined,
        undefined,
        'csocTile'
      )

      expect($('a.govuk-button')).toHaveLength(0)
    })

    test('Should render the cancelled button only when showButton is true', () => {
      const cancelled = {
        type: 'cancelled',
        buttonLabel: 'Resubmit your certificate'
      }

      expect(
        render({ ...cancelled, showButton: true })('a.govuk-button')
      ).toHaveLength(1)
      expect(
        render({ ...cancelled, showButton: false })('a.govuk-button')
      ).toHaveLength(0)
    })

    test.each(['submitted', 'missed'])(
      'Should not change the %s type when showButton is true or false',
      (type) => {
        const extra = {
          type,
          linkText: 'View your statement',
          linkPath: '/statement',
          paragraphSuffix: 'Suffix'
        }

        for (const showButton of [true, false]) {
          const $ = render({ ...extra, showButton })

          expect($('a.govuk-button')).toHaveLength(0)
        }
      }
    )

    test('Should keep the submitted link when showButton is false', () => {
      const $ = render({
        type: 'submitted',
        linkText: 'View your statement',
        linkPath: '/statement',
        showButton: false
      })

      expect($('a.govuk-link').text().trim()).toBe('View your statement')
      expect($('a.govuk-link').attr('href')).toBe('/statement')
    })
  })

  describe('Once the year is submitted', () => {
    let $submitted

    beforeEach(() => {
      $submitted = renderComponent(
        'csoc-tile',
        {
          type: 'submitted',
          linkText: 'View your statement',
          linkPath: '/cso/scheme-1/compliance/statement/statement-1'
        },
        undefined,
        undefined,
        'csocTile'
      )
    })

    test('Should not render the submit button', () => {
      expect($submitted('a.govuk-button')).toHaveLength(0)
    })

    test('Should render a link to the submitted statement', () => {
      const $link = $submitted('a.govuk-link')

      expect($link).toHaveLength(1)
      expect($link.text().trim()).toBe('View your statement')
      expect($link.attr('href')).toBe(
        '/cso/scheme-1/compliance/statement/statement-1'
      )
    })
  })

  describe('Once the deadline has passed without a submission', () => {
    let $missed

    beforeEach(() => {
      $missed = renderComponent(
        'csoc-tile',
        {
          type: 'missed',
          heading: 'You missed the certificate of compliance deadline',
          paragraphPrefix:
            'You missed the submission deadline of 31 January 2027.',
          paragraphSuffix: 'The Environment Agency will contact you.'
        },
        undefined,
        undefined,
        'csocTile'
      )
    })

    test('Should render the missed heading', () => {
      expect($missed('h3.govuk-heading-m').text().trim()).toBe(
        'You missed the certificate of compliance deadline'
      )
    })

    test('Should render the prefix and the suffix as separate paragraphs', () => {
      const $paragraphs = $missed('p.govuk-body')

      expect($paragraphs).toHaveLength(2)
      expect($paragraphs.eq(0).text().trim()).toBe(
        'You missed the submission deadline of 31 January 2027.'
      )
      expect($paragraphs.eq(1).text().trim()).toBe(
        'The Environment Agency will contact you.'
      )
    })

    test('Should not render a submit button or a link', () => {
      expect($missed('a.govuk-button')).toHaveLength(0)
      expect($missed('a.govuk-link')).toHaveLength(0)
    })
  })

  describe('Once the year has been cancelled', () => {
    let $cancelled

    beforeEach(() => {
      $cancelled = renderComponent(
        'csoc-tile',
        {
          type: 'cancelled',
          heading: 'Resubmit your certificate of compliance',
          paragraphPrefix:
            'The Environment Agency cancelled your 2026 certificate of compliance.',
          buttonLabel: 'Resubmit your certificate',
          submitPath: '/producer/compliance/certificate?year=2026',
          showButton: true
        },
        undefined,
        undefined,
        'csocTile'
      )
    })

    test('Should render the cancelled heading and paragraph', () => {
      expect($cancelled('h3.govuk-heading-m').text().trim()).toBe(
        'Resubmit your certificate of compliance'
      )
      expect(
        $cancelled('p.govuk-body').text().replace(/\s+/g, ' ').trim()
      ).toBe(
        'The Environment Agency cancelled your 2026 certificate of compliance.'
      )
    })

    test('Should render a secondary resubmit button with the path', () => {
      const $button = $cancelled('a.govuk-button')

      expect($button).toHaveLength(1)
      expect($button.hasClass('govuk-button--secondary')).toBe(true)
      expect($button.text().trim()).toBe('Resubmit your certificate')
      expect($button.attr('href')).toBe(
        '/producer/compliance/certificate?year=2026'
      )
    })
  })

  describe('Elements rendered for each type', () => {
    const allParams = {
      heading: 'Heading',
      paragraphPrefix: 'Prefix',
      deadlineDate: '31 January 2027',
      paragraphSuffix: 'Suffix',
      buttonLabel: 'Button',
      submitPath: '/submit',
      showButton: true,
      linkText: 'Link',
      linkPath: '/link'
    }

    const cases = [
      {
        type: 'submit',
        paragraphs: 1,
        buttons: 1,
        links: 0
      },
      {
        type: 'submitted',
        paragraphs: 1,
        buttons: 0,
        links: 1
      },
      {
        type: 'cancelled',
        paragraphs: 1,
        buttons: 1,
        links: 0
      },
      {
        type: 'missed',
        paragraphs: 2,
        buttons: 0,
        links: 0
      },
      {
        type: 'unknown',
        paragraphs: 1,
        buttons: 0,
        links: 0
      }
    ]

    test.each(cases)(
      'type $type renders $paragraphs paragraph(s), $buttons button(s) and $links link(s)',
      ({ type, paragraphs, buttons, links }) => {
        const $ = renderComponent(
          'csoc-tile',
          { ...allParams, type },
          undefined,
          undefined,
          'csocTile'
        )

        expect($('h3.govuk-heading-m')).toHaveLength(1)
        expect($('p.govuk-body')).toHaveLength(paragraphs)
        expect($('a.govuk-button')).toHaveLength(buttons)
        expect($('a.govuk-link')).toHaveLength(links)
      }
    )

    test('only the missed type renders the suffix paragraph', () => {
      const types = ['submit', 'submitted', 'cancelled', 'missed']

      for (const type of types) {
        const $ = renderComponent(
          'csoc-tile',
          { ...allParams, type },
          undefined,
          undefined,
          'csocTile'
        )

        expect($.html().includes('Suffix')).toBe(type === 'missed')
      }
    })
  })
})
