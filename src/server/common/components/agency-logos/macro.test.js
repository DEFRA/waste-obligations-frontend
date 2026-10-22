import { renderComponent } from '#/test-helpers/component-helpers.js'

const getAssetPath = (asset) => `/public/${asset}`

const altTexts = {
  ea: 'Environment Agency',
  niea: 'Northern Ireland Environment Agency',
  sepa: 'Scottish Environment Protection Agency',
  nrw: 'Natural Resources Wales'
}

function renderAgencyLogos(params) {
  return renderComponent(
    'agency-logos',
    { altTexts, ...params },
    undefined,
    { getAssetPath },
    'agencyLogos'
  )
}

describe('agency-logos Component', () => {
  test('renders a logo for each of the four regulators', () => {
    const $logos = renderAgencyLogos({ isPdf: false })

    expect($logos('.prn-logos-items')).toHaveLength(4)
    expect($logos('img:not(.prn-pdf-logo)')).toHaveLength(4)
    expect($logos('img.prn-pdf-logo')).toHaveLength(4)
  })

  test('uses SVG logos on screen and keeps PNG logos for the PDF', () => {
    const $logos = renderAgencyLogos({ isPdf: false })
    const sources = $logos('img:not(.prn-pdf-logo)')
      .map((_, img) => $logos(img).attr('src'))
      .get()
    const pdfSources = $logos('img.prn-pdf-logo')
      .map((_, img) => $logos(img).attr('src'))
      .get()

    expect(sources).toEqual([
      '/public/src/client/images/logos/ea.svg',
      '/public/src/client/images/logos/niea.svg',
      '/public/src/client/images/logos/sepa.svg',
      '/public/src/client/images/logos/nrw.svg'
    ])
    expect(pdfSources).toEqual([
      '/public/src/client/images/logos/ea.png',
      '/public/src/client/images/logos/niea.png',
      '/public/src/client/images/logos/sepa.png',
      '/public/src/client/images/logos/nrw.png'
    ])
    expect($logos('img.prn-pdf-logo').first().attr('class')).toBe(
      'prn-pdf-logo prn-pdf-only'
    )
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

  test('uses the alt text supplied for each regulator', () => {
    const $logos = renderAgencyLogos({ isPdf: false })
    const altText = $logos('img:not(.prn-pdf-logo)')
      .map((_, img) => $logos(img).attr('alt'))
      .get()
    const pdfAltText = $logos('img.prn-pdf-logo')
      .map((_, img) => $logos(img).attr('alt'))
      .get()

    expect(altText).toEqual([
      altTexts.ea,
      altTexts.niea,
      altTexts.sepa,
      altTexts.nrw
    ])
    expect(pdfAltText).toEqual(altText)
  })
})
