import { renderComponent } from '#/test-helpers/component-helpers.js'

describe('Heading Component', () => {
  let $heading

  describe('With caption', () => {
    beforeEach(() => {
      $heading = renderComponent('heading', {
        text: 'Services',
        caption: 'A page showing available services'
      })
    })

    test('Should render app heading component', () => {
      expect($heading('[data-testid="app-heading"]')).toHaveLength(1)
    })

    test('Should contain expected heading', () => {
      expect($heading('[data-testid="app-heading-title"]').text().trim()).toBe(
        'Services'
      )
    })

    test('Should have expected heading caption', () => {
      expect(
        $heading('[data-testid="app-heading-caption"]').text().trim()
      ).toBe('A page showing available services')
    })
  })

  describe('Grid column width', () => {
    test('defaults to two-thirds column', () => {
      const $default = renderComponent('heading', { text: 'Title only' })
      expect(
        $default('[data-testid="app-heading"] > div').first().attr('class')
      ).toContain('govuk-grid-column-two-thirds')
    })

    test('allows full-width column class', () => {
      const $full = renderComponent('heading', {
        text: 'Wide title',
        gridColumnClasses: 'govuk-grid-column-full'
      })
      expect(
        $full('[data-testid="app-heading"] > div').first().attr('class')
      ).toContain('govuk-grid-column-full')
    })
  })
})
