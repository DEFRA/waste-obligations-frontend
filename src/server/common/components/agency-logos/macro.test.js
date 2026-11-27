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
    const $logos = renderAgencyLogos()

    expect($logos('.prn-logos-items')).toHaveLength(4)
    expect($logos('img:not(.prn-pdf-logo)')).toHaveLength(4)
    expect($logos('img.prn-pdf-logo')).toHaveLength(4)
  })

  test('uses SVG logos on screen and keeps PNG logos for the PDF', () => {
    const $logos = renderAgencyLogos()
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
  })

  test('marks each logo with its agency so one can be sized on its own', () => {
    const $logos = renderAgencyLogos()
    const classes = $logos('img')
      .map((_, img) => $logos(img).attr('class'))
      .get()

    expect(classes).toEqual([
      'prn-logo prn-logo--ea prn-hide-in-pdf',
      'prn-logo prn-pdf-logo prn-logo--ea prn-pdf-only',
      'prn-logo prn-logo--niea prn-hide-in-pdf',
      'prn-logo prn-pdf-logo prn-logo--niea prn-pdf-only',
      'prn-logo prn-logo--sepa prn-hide-in-pdf',
      'prn-logo prn-pdf-logo prn-logo--sepa prn-pdf-only',
      'prn-logo prn-logo--nrw prn-hide-in-pdf',
      'prn-logo prn-pdf-logo prn-logo--nrw prn-pdf-only'
    ])
  })

  test('hides the SVG logos in the PDF and shows the PNG logos only in the PDF', () => {
    const $logos = renderAgencyLogos()

    expect($logos('img.prn-hide-in-pdf')).toHaveLength(4)
    expect($logos('img.prn-pdf-only')).toHaveLength(4)
    expect($logos('img.prn-hide-in-pdf.prn-pdf-only')).toHaveLength(0)
    expect(
      $logos('img.prn-hide-in-pdf')
        .map((_, img) => $logos(img).attr('src'))
        .get()
        .every((src) => src.endsWith('.svg'))
    ).toBe(true)
    expect(
      $logos('img.prn-pdf-only')
        .map((_, img) => $logos(img).attr('src'))
        .get()
        .every((src) => src.endsWith('.png'))
    ).toBe(true)
  })

  // The widths and spacing come from the stylesheet and are measured in the
  // browser (integration/journeys/producer-prn-agency-logos.spec.js); the
  // markup sets the order and what each column holds.
  test('puts each agency in its own column, in order, with its screen and PDF logo', () => {
    const $logos = renderAgencyLogos()
    const columns = $logos('.prn-logos-container > .prn-logos-items')
      .map((_, column) =>
        $logos(column)
          .children('img')
          .map((_, img) => $logos(img).attr('class'))
          .get()
          .join(' | ')
      )
      .get()

    expect(columns).toEqual(
      ['ea', 'niea', 'sepa', 'nrw'].map(
        (agency) =>
          `prn-logo prn-logo--${agency} prn-hide-in-pdf | prn-logo prn-pdf-logo prn-logo--${agency} prn-pdf-only`
      )
    )
  })

  test('uses the alt text supplied for each regulator', () => {
    const $logos = renderAgencyLogos()
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
