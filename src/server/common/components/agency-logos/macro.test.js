import { renderComponent } from '#/test-helpers/component-helpers.js'

const getAssetPath = (asset) => `/public/${asset}`

function renderAgencyLogos(params) {
  return renderComponent(
    'agency-logos',
    params,
    undefined,
    { getAssetPath },
    'agencyLogos'
  )
}

describe('agency-logos Component', () => {
  test('renders a logo for each of the four regulators', () => {
    const $logos = renderAgencyLogos({ isPdf: false })

    expect($logos('img')).toHaveLength(4)
  })

  test('uses SVG logos with no extra class when not rendering for PDF', () => {
    const $logos = renderAgencyLogos({ isPdf: false })
    const sources = $logos('img')
      .map((_, img) => $logos(img).attr('src'))
      .get()

    expect(sources).toEqual([
      '/public/src/client/images/logos/ea.svg',
      '/public/src/client/images/logos/niea.svg',
      '/public/src/client/images/logos/sepa.svg',
      '/public/src/client/images/logos/nrw.svg'
    ])
    expect($logos('img').first().attr('class')).toBe('')
  })

  test('uses PNG logos with the prn-pdf-logo class when rendering for PDF', () => {
    const $logos = renderAgencyLogos({ isPdf: true })
    const sources = $logos('img')
      .map((_, img) => $logos(img).attr('src'))
      .get()

    expect(sources).toEqual([
      '/public/src/client/images/logos/ea.png',
      '/public/src/client/images/logos/niea.png',
      '/public/src/client/images/logos/sepa.png',
      '/public/src/client/images/logos/nrw.png'
    ])
    expect($logos('img').first().attr('class')).toBe('prn-pdf-logo')
  })
})
