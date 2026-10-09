import { renderComponent } from '#/test-helpers/component-helpers.js'

function renderPrnFlashLabel(params) {
  return renderComponent('prn-flash-label', params)
}

describe('prn-flash-label Component', () => {
  test('renders the label text', () => {
    const $label = renderPrnFlashLabel({
      backgroundColor: 'blue',
      labelText: 'Can be accepted towards 2026'
    })

    expect($label('.flash-container').text().trim()).toBe(
      'Can be accepted towards 2026'
    )
  })

  test('applies the given background colour modifier class', () => {
    const $label = renderPrnFlashLabel({
      backgroundColor: 'blue',
      labelText: 'Can be accepted towards 2026'
    })

    expect($label('.flash-container').hasClass('flash-container--blue')).toBe(
      true
    )
  })

  test('defaults to the grey background colour when none is given', () => {
    const $label = renderPrnFlashLabel({
      labelText: 'Can be accepted towards 2026'
    })

    expect($label('.flash-container').hasClass('flash-container--grey')).toBe(
      true
    )
  })

  test('sets the test id when one is given', () => {
    const $label = renderPrnFlashLabel({
      labelText: 'Can be accepted towards 2026',
      dataTestId: 'december-waste-label'
    })

    expect($label('.flash-container').attr('data-testid')).toBe(
      'december-waste-label'
    )
  })

  test('omits the test id attribute when none is given', () => {
    const $label = renderPrnFlashLabel({
      labelText: 'Can be accepted towards 2026'
    })

    expect($label('.flash-container').attr('data-testid')).toBeUndefined()
  })
})
