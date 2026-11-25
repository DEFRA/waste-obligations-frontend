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
  const logos = page.locator('.prn-logos-items img.prn-logo')
  await expect(logos).toHaveCount(4)

  return logos.evaluateAll((images) =>
    images.map((image) => {
      const box = image.getBoundingClientRect()
      const column = image.parentElement.getBoundingClientRect()
      return {
        agency: image.className.replace(/.*prn-logo--/, ''),
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

for (const viewport of [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 375, height: 812 }
]) {
  test(`keeps the Environment Agency logo in proportion with the other agency logos on ${viewport.name}`, async ({
    page
  }) => {
    await page.setViewportSize(viewport)
    await visitAuthenticatedPath(
      page,
      `${producerPrnPath(PRODUCER_AWAITING_ACCEPTANCE_PRN_ID)}?year=${INTEGRATION_OBLIGATION_YEAR}`
    )

    const boxes = await logoBoxes(page)
    expect(boxes.map(({ agency }) => agency)).toEqual([
      'ea',
      'niea',
      'sepa',
      'nrw'
    ])

    // SEPA and NRW artwork fills its image, so their heights are the size
    // the eye compares the Environment Agency logo with. NIEA's image has
    // space around its artwork, so its height says little.
    const [ea, , sepa, nrw] = boxes
    expect(ea.width).toBeLessThan(ea.columnWidth)
    expect(ea.height).toBeLessThanOrEqual(sepa.height)
    expect(ea.height).toBeLessThanOrEqual(nrw.height)

    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(box.columnLeft)
      expect(box.right).toBeLessThanOrEqual(box.columnRight)
    }
    for (let index = 1; index < boxes.length; index++) {
      expect(boxes[index].left).toBeGreaterThanOrEqual(boxes[index - 1].right)
    }
  })
}
