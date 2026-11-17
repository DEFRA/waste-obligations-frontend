import { renderComponent } from '#/test-helpers/component-helpers.js'

function renderRecyclingNoteRow(params) {
  return renderComponent(
    'recycling-note-row',
    params,
    undefined,
    undefined,
    'recyclingNoteRow'
  )
}

describe('recycling-note-row Component', () => {
  test('renders the label', () => {
    const $row = renderRecyclingNoteRow({ label: 'Status', value: 'Accepted' })

    expect($row('label').text().trim()).toBe('Status')
  })

  test('renders the value', () => {
    const $row = renderRecyclingNoteRow({ label: 'Status', value: 'Accepted' })

    expect($row('.status').text().trim()).toBe('Accepted')
  })

  test('links the label to the value using a lower-cased id derived from the label', () => {
    const $row = renderRecyclingNoteRow({
      label: 'Reproccessing Site',
      value: 'Example Site'
    })

    expect($row('label').attr('for')).toBe('reproccessing site')
    expect($row('[id="reproccessing site"]').text().trim()).toBe('Example Site')
  })

  test('marks the row so a PDF page break does not cut through it', () => {
    const $row = renderRecyclingNoteRow({ label: 'Status', value: 'Accepted' })

    expect($row('.recycling-note-row')).toHaveLength(1)
    expect($row('.recycling-note-row label').text().trim()).toBe('Status')
    expect($row('.recycling-note-row .status').text().trim()).toBe('Accepted')
  })

  test('renders a divider after the row', () => {
    const $row = renderRecyclingNoteRow({ label: 'Status', value: 'Accepted' })

    expect($row('hr')).toHaveLength(1)
  })
})
