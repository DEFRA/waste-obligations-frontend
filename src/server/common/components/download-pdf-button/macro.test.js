import { renderComponent } from '#/test-helpers/component-helpers.js'

function renderDownloadPdfButton(params) {
  return renderComponent(
    'download-pdf-button',
    params,
    undefined,
    undefined,
    'downloadPdfButton'
  )
}

describe('download-pdf-button Component', () => {
  test('renders a GOV.UK button with the given text', () => {
    const $button = renderDownloadPdfButton({ text: 'Download this PRN' })

    expect($button('button').text().trim()).toBe('Download this PRN')
  })

  test('applies the download-pdf-button classes for the client-side handler', () => {
    const $button = renderDownloadPdfButton({ text: 'Download this PRN' })

    expect($button('button').attr('class')).toBe(
      'govuk-button govuk-body govuk-link download-pdf-button'
    )
  })
})
