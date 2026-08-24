import html2pdf from './html2pdf-0.9.3.min'

export function initDownloadPdf() {
  document.addEventListener('DOMContentLoaded', () => {
    const downloadButton = document.querySelector(
      '.download-pdf-button.govuk-link'
    )
    if (!downloadButton) {
      return
    }

    downloadButton.addEventListener('click', () => {
      downloadPDF().catch((error) =>
        console.error('Error in downloadPDF:', error)
      )
    })
  })
}

async function downloadPDF() {
  const pathSegments = window.location.pathname.split('/')
  const typePosition = pathSegments.length - 2
  const prnType = pathSegments.at(typePosition) // Example: 'accepted-prn', 'selected-prn', or 'rejected-prn'
  const guidPosition = pathSegments.length - 1
  const prnGuid = pathSegments.at(guidPosition)

  const downloadUrl = `/report-data/download-${prnType}-pdf/${prnGuid}`

  const response = await fetch(downloadUrl, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  const { fileName, htmlContent } = await response.json()

  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent

  const options = {
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

  await html2pdf().from(tempDiv).set(options).save()
  tempDiv.remove()
}
