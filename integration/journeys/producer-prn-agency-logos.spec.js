import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_ACCEPTED_PRN_ID,
  PRODUCER_AWAITING_ACCEPTANCE_PRN_ID,
  PRODUCER_REJECTED_PRN_ID,
  producerPrnPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

// The boxes come from the browser, which applies the real stylesheet.
async function logoBoxes(page) {
  const logos = page.locator('.prn-logos-items img.prn-logo:not(.prn-pdf-logo)')
  await expect(logos).toHaveCount(4)

  return logos.evaluateAll((images) =>
    images.map((image) => {
      // The row's content width, which the logo height is a share of.
      const rowWidth = image.closest('.prn-logos-container').clientWidth
      const box = image.getBoundingClientRect()
      const column = image.parentElement.getBoundingClientRect()
      return {
        agency: image.className.match(/prn-logo--(\w+)/)[1],
        left: box.left,
        right: box.right,
        width: box.width,
        height: box.height,
        columnLeft: column.left,
        columnRight: column.right,
        columnWidth: column.width,
        rowWidth
      }
    })
  )
}

async function visitPrn(page, prnId, viewport) {
  await page.setViewportSize(viewport)
  await visitAuthenticatedPath(
    page,
    `${producerPrnPath(prnId)}?year=${INTEGRATION_OBLIGATION_YEAR}`
  )
}

// The width html2pdf lays the PRN out at (prn-print.js PDF_LAYOUT_WIDTH_PX).
const PDF_WIDTH_PX = 767

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 }
]

// Every logo is this high, or less where the row is too narrow for four
// logos at it: then 4% of the row (_agency-logos.scss).
const LOGO_HEIGHT_PX = 30
const LOGO_HEIGHT_SHARE_OF_ROW = 0.04

function expectedLogoHeight(rowWidth) {
  return Math.min(LOGO_HEIGHT_PX, rowWidth * LOGO_HEIGHT_SHARE_OF_ROW)
}

// Each logo's artwork fills at least this share of its image's height, so
// logos of one height look one size. The old NIEA SVG filled about a third.
const MIN_ARTWORK_HEIGHT_SHARE = 0.85

// Every status renders the same logo row; the accepted page only adds
// prn-logos-row-accepted, which sets its top margin. So the awaiting
// acceptance page is measured at every width, and the accepted and rejected
// pages at desktop width, to show the row is the same there.
const PRN_PAGES = [
  {
    status: 'awaiting acceptance',
    prnId: PRODUCER_AWAITING_ACCEPTANCE_PRN_ID,
    statusTag: 'Awaiting acceptance',
    viewports: VIEWPORTS
  },
  {
    status: 'accepted',
    prnId: PRODUCER_ACCEPTED_PRN_ID,
    statusTag: 'Accepted',
    viewports: [VIEWPORTS[0]]
  },
  {
    status: 'rejected',
    prnId: PRODUCER_REJECTED_PRN_ID,
    statusTag: 'Rejected',
    viewports: [VIEWPORTS[0]]
  }
]

// Without container units every logo keeps the 30px fallback height, and one
// too wide for its column is scaled down inside its box.
async function checkLogoLayout(page, viewport, { containerUnits = true } = {}) {
  const boxes = await logoBoxes(page)
  expect(boxes.map(({ agency }) => agency)).toEqual([
    'ea',
    'niea',
    'sepa',
    'nrw'
  ])

  // Every logo is the shared height: 30px, or 4% of a narrower row. With
  // each artwork filling its image (checked below), one height means one
  // visible size.
  const expectedHeight = containerUnits
    ? expectedLogoHeight(boxes[0].rowWidth)
    : LOGO_HEIGHT_PX
  for (const box of boxes) {
    expect(box.height, box.agency).toBeCloseTo(expectedHeight, 0)
  }

  // Each logo stays inside its own column, side by side.
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(box.columnLeft)
    expect(box.right).toBeLessThanOrEqual(box.columnRight)
  }
  for (let index = 1; index < boxes.length; index++) {
    expect(boxes[index].left).toBeGreaterThanOrEqual(boxes[index - 1].right)
  }

  // The logo row does not make the page scroll sideways.
  const pageWidth = await page.evaluate(
    () => document.documentElement.scrollWidth
  )
  expect(pageWidth).toBeLessThanOrEqual(viewport.width)
}

// One page load per status; the window is then resized to each width.
for (const { status, prnId, statusTag, viewports } of PRN_PAGES) {
  test(`lays out the agency logos at one height and within the page on the ${status} PRN page, at ${viewports.map(({ name }) => name).join(', ')} width`, async ({
    page
  }) => {
    await visitPrn(page, prnId, viewports[0])
    await expect(
      page.locator('.govuk-tag').getByText(statusTag, { exact: true })
    ).toBeVisible()

    for (const viewport of viewports) {
      await test.step(viewport.name, async () => {
        await page.setViewportSize(viewport)
        await checkLogoLayout(page, viewport)
      })
    }
  })
}

// A browser without container query units drops each declaration that uses
// them when it reads the stylesheet. Removing those declarations from the
// loaded stylesheets gives the page that browser would lay out.
test('keeps the agency logos at the 30px fallback and within the page without container query units, on desktop, tablet and mobile', async ({
  page
}) => {
  await visitPrn(page, PRODUCER_AWAITING_ACCEPTANCE_PRN_ID, VIEWPORTS[0])
  const removed = await page.evaluate(() => {
    const dropped = []
    const visit = (rules) => {
      for (const rule of rules) {
        if (rule.style) {
          for (const property of [...rule.style]) {
            if (/\dcqi\b/.test(rule.style.getPropertyValue(property))) {
              dropped.push(`${rule.selectorText} ${property}`)
              rule.style.removeProperty(property)
            }
          }
        }
        if (rule.cssRules) visit(rule.cssRules)
      }
    }
    for (const sheet of document.styleSheets) visit(sheet.cssRules)
    return dropped
  })
  expect(removed).toEqual(['.prn-logo height'])

  for (const viewport of VIEWPORTS) {
    await test.step(viewport.name, async () => {
      await page.setViewportSize(viewport)
      await checkLogoLayout(page, viewport, { containerUnits: false })
    })
  }
})

// Measures how much of each logo file's height its artwork fills: for an SVG,
// the drawn shapes' bounds within its viewBox; for a PNG, the rows with
// visible, non-white pixels.
async function artworkHeightShares(page, selector) {
  return page.locator(selector).evaluateAll((images) =>
    Promise.all(
      images.map(async (image) => {
        const agency = image.className.match(/prn-logo--(\w+)/)[1]
        const source = image.currentSrc || image.src

        if (source.split('?')[0].endsWith('.svg')) {
          const text = await (await fetch(source)).text()
          const holder = document.createElement('div')
          holder.style.cssText = 'position: absolute; visibility: hidden'
          holder.innerHTML = text
          document.body.appendChild(holder)
          const svg = holder.querySelector('svg')
          const view = svg.viewBox.baseVal
          const art = svg.getBBox()
          holder.remove()
          const top = Math.max(art.y, view.y)
          const bottom = Math.min(art.y + art.height, view.y + view.height)
          return { agency, share: (bottom - top) / view.height }
        }

        const png = document.createElement('img')
        png.src = source
        await png.decode()
        const canvas = document.createElement('canvas')
        canvas.width = png.naturalWidth
        canvas.height = png.naturalHeight
        const context = canvas.getContext('2d')
        context.drawImage(png, 0, 0)
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
        const rowHasInk = (y) => {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4
            const [red, green, blue, alpha] = pixels.data.slice(i, i + 4)
            if (alpha > 8 && !(red > 245 && green > 245 && blue > 245)) {
              return true
            }
          }
          return false
        }
        let top = 0
        while (top < canvas.height && !rowHasInk(top)) top++
        let bottom = canvas.height
        while (bottom > top && !rowHasInk(bottom - 1)) bottom--
        return { agency, share: (bottom - top) / canvas.height }
      })
    )
  )
}

test('draws each agency logo file with its artwork filling its height, on screen and in the PDF', async ({
  page
}) => {
  await visitPrn(page, PRODUCER_AWAITING_ACCEPTANCE_PRN_ID, VIEWPORTS[0])

  for (const [version, selector] of [
    ['screen SVG', '.prn-logos-items img.prn-logo:not(.prn-pdf-logo)'],
    ['PDF PNG', '.prn-logos-items img.prn-pdf-logo']
  ]) {
    const shares = await artworkHeightShares(page, selector)
    expect(shares.map(({ agency }) => agency)).toEqual([
      'ea',
      'niea',
      'sepa',
      'nrw'
    ])
    for (const { agency, share } of shares) {
      expect(share, `${version} ${agency}`).toBeGreaterThanOrEqual(
        MIN_ARTWORK_HEIGHT_SHARE
      )
    }
  }
})

// The PDF is drawn from a copy of the page that the download prepares: the
// PNG logos replace the SVGs and the logo row takes the PDF layout. Standing
// in for html2pdf captures that copy, which is then laid out at the PDF's
// 767px width with the page's own stylesheet and measured.
test('lays out the PDF logos in one row, at one height, within the PDF width', async ({
  page
}) => {
  await visitPrn(page, PRODUCER_AWAITING_ACCEPTANCE_PRN_ID, VIEWPORTS[0])
  await page.evaluate(() => {
    globalThis.html2pdf = () => ({
      from(source) {
        globalThis.capturedPrnPdfSource = source
        return { set: () => ({ save: () => Promise.resolve() }) }
      }
    })
  })

  await page.locator('[data-prn-print]').first().click()
  await page.waitForFunction(() => globalThis.capturedPrnPdfSource)

  const pdf = await page.evaluate((pdfWidth) => {
    const layout = document.createElement('div')
    layout.style.cssText = `position: absolute; left: 0; top: 0; width: ${pdfWidth}px`
    layout.appendChild(globalThis.capturedPrnPdfSource)
    document.body.appendChild(layout)

    const layoutBox = layout.getBoundingClientRect()
    const container = layout.querySelector('.prn-logos-container')
    const containerBox = container.getBoundingClientRect()
    return {
      containerClasses: [...container.classList],
      containerRight: containerBox.right - layoutBox.left,
      // The row's content width, which the logo height is a share of.
      rowWidth: container.clientWidth,
      svgLogoCount: layout.querySelectorAll(
        '.prn-logos-items img:not(.prn-pdf-logo)'
      ).length,
      logos: [
        ...layout.querySelectorAll('.prn-logos-items img.prn-pdf-logo')
      ].map((image) => {
        const box = image.getBoundingClientRect()
        return {
          agency: image.className.match(/prn-logo--(\w+)/)[1],
          left: box.left - layoutBox.left,
          right: box.right - layoutBox.left,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height
        }
      })
    }
  }, PDF_WIDTH_PX)

  expect(pdf.containerClasses).toContain('prn-logos-pdf-container')
  // The logo row itself, not only each logo, fits the PDF width.
  expect(pdf.containerRight).toBeLessThanOrEqual(PDF_WIDTH_PX)
  expect(pdf.svgLogoCount).toBe(0)
  expect(pdf.logos.map(({ agency }) => agency)).toEqual([
    'ea',
    'niea',
    'sepa',
    'nrw'
  ])

  for (const logo of pdf.logos) {
    expect(logo.width).toBeGreaterThan(0)
    expect(logo.left).toBeGreaterThanOrEqual(0)
    expect(logo.right).toBeLessThanOrEqual(PDF_WIDTH_PX)
  }
  for (let index = 1; index < pdf.logos.length; index++) {
    const logo = pdf.logos[index]
    const previous = pdf.logos[index - 1]
    // Side by side in one row: each starts after the last ends, and their
    // heights overlap.
    expect(logo.left).toBeGreaterThanOrEqual(previous.right)
    expect(logo.top).toBeLessThan(previous.bottom)
    expect(logo.bottom).toBeGreaterThan(previous.top)
  }

  // Every logo is the shared height for the PDF's logo row: 30px, or 4% of
  // a narrower row.
  const expectedHeight = expectedLogoHeight(pdf.rowWidth)
  for (const logo of pdf.logos) {
    expect(logo.height, logo.agency).toBeCloseTo(expectedHeight, 0)
  }
})

// The PDF is an image of the page that html2pdf draws onto a canvas
// (through html2canvas). Here the real html2pdf runs, and its canvas is kept
// instead of saving the file, so the logos are measured as the PDF shows them.
// The logos are the top band of the canvas with any drawing on it; each logo
// is a run of columns with drawing, set apart from the next by a wider gap
// than any inside a logo.
const LOGO_GAP_CSS_PX = 10

test('html2pdf draws the four agency logos in one row, at one size, within the PDF', async ({
  page
}) => {
  await page.addInitScript(() => {
    let html2pdf
    Object.defineProperty(globalThis, 'html2pdf', {
      configurable: true,
      set(loaded) {
        html2pdf = loaded
      },
      get() {
        return (
          html2pdf &&
          (() => ({
            from: (source) => ({
              set: (options) => ({
                async save() {
                  globalThis.renderedPrnSource = source
                  globalThis.renderedPrnCanvas = await html2pdf()
                    .from(source)
                    .set(options)
                    .toCanvas()
                    .get('canvas')
                }
              })
            })
          }))
        )
      }
    })
  })
  await visitPrn(page, PRODUCER_AWAITING_ACCEPTANCE_PRN_ID, VIEWPORTS[0])

  await page.locator('[data-prn-print]').first().click()
  await page.waitForFunction(() => globalThis.renderedPrnCanvas)

  const rendered = await page.evaluate(
    ({ pdfWidth, gapCssPx }) => {
      const canvas = globalThis.renderedPrnCanvas
      const scale = canvas.width / pdfWidth
      const bandLimit = Math.min(canvas.height, Math.round(200 * scale))
      const { data } = canvas
        .getContext('2d')
        .getImageData(0, 0, canvas.width, bandLimit)
      const hasInk = (x, y) => {
        const i = (y * canvas.width + x) * 4
        return data[i] < 230 || data[i + 1] < 230 || data[i + 2] < 230
      }
      const rowHasInk = (y, from = 0, to = canvas.width) => {
        for (let x = from; x < to; x++) {
          if (hasInk(x, y)) return true
        }
        return false
      }

      // The logo band: from the first row with drawing to the first clear gap.
      let top = 0
      while (top < bandLimit && !rowHasInk(top)) top++
      let bottom = top
      for (let y = top, blank = 0; y < bandLimit; y++) {
        if (rowHasInk(y)) {
          bottom = y + 1
          blank = 0
        } else if (++blank > 5 * scale) {
          break
        }
      }

      const columnHasInk = (x) => {
        for (let y = top; y < bottom; y++) {
          if (hasInk(x, y)) return true
        }
        return false
      }
      const logos = []
      let start = -1
      let end = -1
      for (let x = 0; x <= canvas.width; x++) {
        const ink = x < canvas.width && columnHasInk(x)
        if (ink) {
          if (start < 0) start = x
          end = x + 1
        } else if (
          start >= 0 &&
          (x === canvas.width || x - end > gapCssPx * scale)
        ) {
          let logoTop = top
          while (!rowHasInk(logoTop, start, end)) logoTop++
          let logoBottom = bottom
          while (!rowHasInk(logoBottom - 1, start, end)) logoBottom--
          logos.push({
            left: start / scale,
            right: end / scale,
            height: (logoBottom - logoTop) / scale
          })
          start = -1
        }
      }
      // html2pdf draws from its own copy, so the prepared page is laid out
      // at the PDF width here to read the logo row's width.
      const layout = document.createElement('div')
      layout.style.cssText = `position: absolute; left: 0; top: 0; width: ${pdfWidth}px`
      layout.appendChild(globalThis.renderedPrnSource)
      document.body.appendChild(layout)
      const rowWidth = layout.querySelector('.prn-logos-container').clientWidth
      layout.remove()

      return { width: canvas.width / scale, rowWidth, logos }
    },
    { pdfWidth: PDF_WIDTH_PX, gapCssPx: LOGO_GAP_CSS_PX }
  )

  expect(rendered.width).toBe(PDF_WIDTH_PX)
  expect(rendered.logos).toHaveLength(4)
  // None is cut off at either edge of the PDF.
  expect(rendered.logos[0].left).toBeGreaterThan(0)
  expect(rendered.logos[3].right).toBeLessThan(PDF_WIDTH_PX)
  // Each logo's drawing is at least 85% of the shared logo height for the
  // PDF's logo row, and no taller than it, so the four look one size.
  const expectedHeight = expectedLogoHeight(rendered.rowWidth)
  for (const logo of rendered.logos) {
    expect(logo.height).toBeGreaterThanOrEqual(
      expectedHeight * MIN_ARTWORK_HEIGHT_SHARE
    )
    expect(logo.height).toBeLessThanOrEqual(expectedHeight + 1)
  }
})
