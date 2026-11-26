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
