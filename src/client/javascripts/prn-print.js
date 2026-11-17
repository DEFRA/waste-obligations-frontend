import { sanitizeFilenamePart } from './print-utils'

// The html2pdf settings of epr-packaging-frontend assets/js/download-pdf.js,
// plus page breaks: a detail row or the number box that would cross the foot
// of a page starts the next page, so no text is cut in half.
//
// Packaging sets html2canvas.width to 794. html2pdf leaves room for the rows
// using its layout's width, but cuts the picture into pages using the
// picture's width, so a wider picture is cut lower down each page than the
// room was left, through a row. The picture is drawn exactly as wide as the
// layout instead: the A4 width less the side margins, in CSS pixels, rounded
// down as html2pdf rounds it.
const A4_WIDTH_PT = 595.28
const SIDE_MARGIN_PT = 10
const CSS_PX_PER_INCH = 96
const PT_PER_INCH = 72
const CSS_PX_PER_PT = CSS_PX_PER_INCH / PT_PER_INCH
export const PDF_LAYOUT_WIDTH_PX = Math.floor(
  (A4_WIDTH_PT - 2 * SIDE_MARGIN_PT) * CSS_PX_PER_PT
)
const PDF_KEEP_TOGETHER = ['.recycling-note-row', '.govuk-inset-text']

const PDF_EXCLUDED =
  '.notification-banner, .prn-buttons, .pern-buttons, [data-prn-print], .prn-hide-in-pdf'

export function prnPdfOptions(fileName) {
  return {
    margin: [0, SIDE_MARGIN_PT, 0, SIDE_MARGIN_PT],
    filename: `${fileName}.pdf`,
    html2canvas: {
      scale: 2,
      width: PDF_LAYOUT_WIDTH_PX,
      dpi: 300,
      letterRendering: true,
      useCORS: true
    },
    jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], avoid: PDF_KEEP_TOGETHER }
  }
}

export function preparePrnPdfSource(view) {
  const source = view.cloneNode(true)

  for (const element of source.querySelectorAll(PDF_EXCLUDED)) {
    element.remove()
  }

  for (const element of source.querySelectorAll('.prn-pdf-only')) {
    element.style.display = 'block'
  }

  // Packaging draws the PDF from PNG logos. Screen logos stay SVG.
  for (const image of source.querySelectorAll(
    '.prn-logos-items img:not(.prn-pdf-logo)'
  )) {
    image.remove()
  }

  return source
}

// The packaging file is a classic UMD script. Importing it as an ES module
// runs with `this` undefined and throws before html2pdf is created.
let html2pdfPromise

export function loadHtml2pdf() {
  if (typeof globalThis.html2pdf === 'function') {
    return Promise.resolve(globalThis.html2pdf)
  }

  html2pdfPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')

    script.src = new URL(
      '../../../vendor/html2pdf-0.9.3.min.js',
      import.meta.url
    ).href
    script.onload = () => {
      if (typeof globalThis.html2pdf === 'function') {
        resolve(globalThis.html2pdf)
        return
      }

      html2pdfPromise = null
      reject(new Error('html2pdf did not load'))
    }
    script.onerror = () => {
      html2pdfPromise = null
      reject(new Error('html2pdf did not load'))
    }
    document.head.appendChild(script)
  })

  return html2pdfPromise
}

export async function downloadPrnPdf(button, html2pdf) {
  const view = button.closest('.prn-view, .pern-view')

  if (!view) {
    return
  }

  const fileName = sanitizeFilenamePart(button.dataset.prnNumber) || 'PRN'
  const source = preparePrnPdfSource(view)
  const render = html2pdf ?? (await loadHtml2pdf())

  await render().from(source).set(prnPdfOptions(fileName)).save()
}

export function initPrnPrint() {
  const printButtons = document.querySelectorAll('[data-prn-print]')

  for (const printButton of printButtons) {
    printButton.addEventListener('click', (event) => {
      event.preventDefault()
      downloadPrnPdf(printButton).catch(() => {
        console.error('Unable to download the PRN PDF')
      })
    })
  }
}
