import { expect, test } from '../fixtures/test.js'

import {
  INTEGRATION_OBLIGATION_YEAR,
  PRODUCER_AWAITING_ACCEPTANCE_PRN_ID,
  producerPrnPath
} from '../fixtures/producer-scenario.js'
import { visitAuthenticatedPath } from '../helpers/auth.js'

// The PDF is html2pdf's picture of the page, cut into A4 pages. This lays the
// page out the way html2pdf does before it takes the picture, with the
// options and the source the page itself passes, and measures where each
// detail row falls against the A4 page height.

// Swaps html2pdf for a wrapper that runs only its layout step, then reports
// the page height and every detail row's position, in the container's pixels.
async function captureNextPdfLayout(page, { spacerPx = 0 } = {}) {
  await page.evaluate((spacer) => {
    globalThis.realHtml2pdf ??= globalThis.html2pdf
    const real = globalThis.realHtml2pdf

    globalThis.pdfLayout = new Promise((resolve, reject) => {
      globalThis.html2pdf = () => {
        let source
        let options
        const chain = {
          from(value) {
            source = value
            return chain
          },
          set(value) {
            options = value
            return chain
          },
          save() {
            const filler = document.createElement('div')
            filler.style.height = `${spacer}px`
            source.prepend(filler)

            return real()
              .from(source)
              .set(options)
              .toContainer()
              .then(function measure() {
                const pageHeight = this.prop.pageSize.inner.px.height
                const rows = Array.from(
                  this.prop.container.querySelectorAll('.recycling-note-row'),
                  (row) => {
                    const { top, bottom } = row.getBoundingClientRect()
                    return {
                      label: row.querySelector('label')?.textContent.trim(),
                      top,
                      bottom
                    }
                  }
                )
                document.body.removeChild(this.prop.overlay)
                resolve({ pageHeight, rows })
              })
              .catch(reject)
          }
        }
        return chain
      }
    })
  }, spacerPx)

  await page.locator('[data-prn-print]').first().click()

  return page.evaluate(() => globalThis.pdfLayout)
}

const pageOf = (y, pageHeight) => Math.floor(y / pageHeight)

const rowsCutByAPageBreak = ({ pageHeight, rows }) =>
  rows.filter(
    ({ top, bottom }) =>
      pageOf(top, pageHeight) !== pageOf(bottom - 1, pageHeight)
  )

test.describe('PRN PDF page breaks', () => {
  test('a page break falls between detail rows, never through one', async ({
    page
  }) => {
    const prnUrl = `${producerPrnPath(PRODUCER_AWAITING_ACCEPTANCE_PRN_ID)}?year=${INTEGRATION_OBLIGATION_YEAR}`

    await visitAuthenticatedPath(page, prnUrl)

    // The first click loads html2pdf, as a user's would, and saves the file.
    const download = page.waitForEvent('download')
    await page.locator('[data-prn-print]').first().click()
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/)

    const { pageHeight, rows } = await captureNextPdfLayout(page)
    expect(rows.length).toBeGreaterThan(5)

    // Push the rows down a part of a row at a time, so that, without page
    // break rules, the foot of page 1 would land inside each row in turn.
    const rowHeight = Math.min(...rows.map(({ top, bottom }) => bottom - top))
    const offsets = []
    for (let offset = 0; offset < pageHeight; offset += rowHeight / 2) {
      offsets.push(Math.round(offset))
    }

    let layoutsOverTwoPages = 0

    for (const spacerPx of offsets) {
      const layout = await captureNextPdfLayout(page, { spacerPx })
      const firstPage = pageOf(layout.rows[0].top, layout.pageHeight)
      const lastPage = pageOf(layout.rows.at(-1).bottom - 1, layout.pageHeight)

      if (lastPage > firstPage) {
        layoutsOverTwoPages += 1
      }

      expect(
        rowsCutByAPageBreak(layout).map(({ label }) => label),
        `rows cut by a page break with ${spacerPx}px above the details`
      ).toEqual([])
    }

    expect(
      layoutsOverTwoPages,
      'the details ran across a page break in some layouts'
    ).toBeGreaterThan(offsets.length / 2)
  })
})
