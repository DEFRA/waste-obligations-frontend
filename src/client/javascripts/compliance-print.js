function padTwoDigits(value) {
  return String(value).padStart(2, '0')
}

export function formatPrintTimestamp(date) {
  const day = padTwoDigits(date.getDate())
  const month = padTwoDigits(date.getMonth() + 1)
  const year = String(date.getFullYear()).slice(-2)
  const hours = padTwoDigits(date.getHours())
  const minutes = padTwoDigits(date.getMinutes())
  const seconds = padTwoDigits(date.getSeconds())

  return `${day}${month}${year}-${hours}${minutes}${seconds}`
}

export function sanitizeFilenamePart(value) {
  return String(value ?? '')
    .replace(/[/\\:*?"<>|]/g, '')
    .trim()
}

export function sanitizeOrganisationNameForFilename(value) {
  return sanitizeFilenamePart(value).replace(/\s+/g, '_')
}

export function buildCompliancePrintFilename({
  documentType,
  organisationName,
  obligationYear,
  timestamp = formatPrintTimestamp(new Date())
}) {
  return [
    sanitizeFilenamePart(documentType),
    sanitizeOrganisationNameForFilename(organisationName),
    sanitizeFilenamePart(obligationYear),
    timestamp
  ].join('_')
}

function printCompliancePage(button) {
  const documentType = button.dataset.documentType
  const organisationName = button.dataset.organisationName
  const obligationYear = button.dataset.obligationYear
  const originalTitle = document.title
  const printTitle = buildCompliancePrintFilename({
    documentType,
    organisationName,
    obligationYear
  })

  const restoreTitle = () => {
    document.title = originalTitle
    window.removeEventListener('afterprint', restoreTitle)
  }

  document.title = printTitle
  window.addEventListener('afterprint', restoreTitle)
  window.print()
}

export function initCompliancePrint() {
  const printButton = document.querySelector('[data-compliance-print]')

  if (!printButton) {
    return
  }

  printButton.addEventListener('click', () => {
    printCompliancePage(printButton)
  })
}
