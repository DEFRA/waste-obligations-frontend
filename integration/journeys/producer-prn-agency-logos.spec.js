import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_AWAITING_ACCEPTANCE_PRN_ID,
  producerPrnPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

// Every PRN status renders the same logo row, so one page shows its layout.
// The boxes come from the browser, which applies the real stylesheet.
async function logoBoxes(page) {
  const logos = page.locator('.prn-logos-items img.prn-logo:not(.prn-pdf-logo)')
  await expect(logos).toHaveCount(4)

  return logos.evaluateAll((images) =>
    images.map((image) => {
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
        columnWidth: column.width
      }
    })
  )
}

async function visitAwaitingAcceptancePrn(page, viewport) {
  await page.setViewportSize(viewport)
  await visitAuthenticatedPath(
    page,
    `${producerPrnPath(PRODUCER_AWAITING_ACCEPTANCE_PRN_ID)}?year=${INTEGRATION_OBLIGATION_YEAR}`
  )
}

// The width html2pdf lays the PRN out at (prn-print.js PDF_LAYOUT_WIDTH_PX).
const PDF_WIDTH_PX = 767

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 }
]

// One page load per width runs both checks.
for (const viewport of VIEWPORTS) {
  test(`lays out the agency logos in proportion and within the page on ${viewport.name}`, async ({
    page
  }) => {
    await visitAwaitingAcceptancePrn(page, viewport)

    const boxes = await logoBoxes(page)
    expect(boxes.map(({ agency }) => agency)).toEqual([
      'ea',
      'niea',
      'sepa',
      'nrw'
    ])

    await test.step('the Environment Agency logo is in proportion with the others', () => {
      // The Environment Agency logo is drawn narrower than the others. SEPA
      // and NRW artwork fills its image, so their heights are the size the
      // eye compares it with. NIEA's image has space around its artwork, so
      // its height says little. A few per cent either way is not visible, so
      // the check allows 5%.
      const [ea, , sepa, nrw] = boxes
      expect(ea.width).toBeLessThan(sepa.width)
      expect(ea.height).toBeLessThanOrEqual(sepa.height * 1.05)
      expect(ea.height).toBeLessThanOrEqual(nrw.height * 1.05)
    })

    await test.step('each logo stays inside its own column', () => {
      for (const box of boxes) {
        expect(box.left).toBeGreaterThanOrEqual(box.columnLeft)
        expect(box.right).toBeLessThanOrEqual(box.columnRight)
      }
      for (let index = 1; index < boxes.length; index++) {
        expect(boxes[index].left).toBeGreaterThanOrEqual(boxes[index - 1].right)
      }
    })

    await test.step('the logo row does not make the page scroll sideways', async () => {
      const pageWidth = await page.evaluate(
        () => document.documentElement.scrollWidth
      )
      expect(pageWidth).toBeLessThanOrEqual(viewport.width)
    })
  })
}

// The PDF is drawn from a copy of the page that the download prepares: the
// PNG logos replace the SVGs and the logo row takes the PDF layout. Standing
// in for html2pdf captures that copy, which is then laid out at the PDF's
// 767px width with the page's own stylesheet and measured.
test('lays out the PDF logos in one row, in proportion, within the PDF width', async ({
  page
}) => {
  await visitAwaitingAcceptancePrn(page, { width: 1280, height: 900 })
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
    return {
      containerClasses: [...container.classList],
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

  const [ea, , sepa, nrw] = pdf.logos
  expect(ea.width).toBeLessThan(sepa.width)
  expect(ea.height).toBeLessThanOrEqual(sepa.height * 1.05)
  expect(ea.height).toBeLessThanOrEqual(nrw.height * 1.05)
})
