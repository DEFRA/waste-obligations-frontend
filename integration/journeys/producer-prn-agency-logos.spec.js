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

// The accepted page sets prn-logos-row-accepted on the logo row.
const PRN_PAGES = [
  {
    status: 'awaiting acceptance',
    prnId: PRODUCER_AWAITING_ACCEPTANCE_PRN_ID,
    statusTag: 'Awaiting acceptance'
  },
  {
    status: 'accepted',
    prnId: PRODUCER_ACCEPTED_PRN_ID,
    statusTag: 'Accepted'
  },
  {
    status: 'rejected',
    prnId: PRODUCER_REJECTED_PRN_ID,
    statusTag: 'Rejected'
  }
]

async function checkLogoLayout(page, viewport) {
  const boxes = await logoBoxes(page)
  expect(boxes.map(({ agency }) => agency)).toEqual([
    'ea',
    'niea',
    'sepa',
    'nrw'
  ])

  // The Environment Agency logo is drawn narrower than the others. SEPA and
  // NRW artwork fills its image, so their heights are the size the eye
  // compares it with. NIEA's image has space around its artwork, so its
  // height says little. A few per cent either way is not visible, so the
  // check allows 5%.
  const [ea, , sepa, nrw] = boxes
  expect(ea.width).toBeLessThan(sepa.width)
  expect(ea.height).toBeLessThanOrEqual(sepa.height * 1.05)
  expect(ea.height).toBeLessThanOrEqual(nrw.height * 1.05)

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
for (const { status, prnId, statusTag } of PRN_PAGES) {
  test(`lays out the agency logos in proportion and within the page on the ${status} PRN page, on desktop, tablet and mobile`, async ({
    page
  }) => {
    await visitPrn(page, prnId, VIEWPORTS[0])
    await expect(
      page.locator('.govuk-tag').getByText(statusTag, { exact: true })
    ).toBeVisible()

    for (const viewport of VIEWPORTS) {
      await test.step(viewport.name, async () => {
        await page.setViewportSize(viewport)
        await checkLogoLayout(page, viewport)
      })
    }
  })
}

// The PDF is drawn from a copy of the page that the download prepares: the
// PNG logos replace the SVGs and the logo row takes the PDF layout. Standing
// in for html2pdf captures that copy, which is then laid out at the PDF's
// 767px width with the page's own stylesheet and measured.
test('lays out the PDF logos in one row, in proportion, within the PDF width', async ({
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

  const [ea, , sepa, nrw] = pdf.logos
  expect(ea.width).toBeLessThan(sepa.width)
  expect(ea.height).toBeLessThanOrEqual(sepa.height * 1.05)
  expect(ea.height).toBeLessThanOrEqual(nrw.height * 1.05)
})
