import { sanitizeFilenamePart } from './print-utils'

// Same html2pdf settings as epr-packaging-frontend assets/js/download-pdf.js.
const PDF_EXCLUDED =
  '.notification-banner, .prn-buttons, .pern-buttons, [data-prn-print], .prn-hide-in-pdf'

export function prnPdfOptions(fileName) {
  return {
    margin: [0, 10, 0, 10],
    filename: `${fileName}.pdf`,
    html2canvas: {
      scale: 2,
      width: 794,
      dpi: 300,
      letterRendering: true,
      useCORS: true
    },
    jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
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

      html2pdfPromise = undefined
      reject(new Error('html2pdf did not load'))
    }
    script.onerror = () => {
      html2pdfPromise = undefined
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
