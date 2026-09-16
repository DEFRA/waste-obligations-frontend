import {
  sanitizeFilenamePart,
  sanitizeOrganisationNameForFilename,
  formatPrintTimestamp
} from './print-utils'

export function buildPrnPrintFilename({
  documentType,
  organisationName,
  obligationYear,
  timestamp = formatPrintTimestamp(new Date())
}) {
  // <DocumentType>_<OrganisationName>_<ObligationYear>_<Timestamp>
  return [
    sanitizeFilenamePart(documentType),
    sanitizeOrganisationNameForFilename(organisationName),
    sanitizeFilenamePart(obligationYear),
    timestamp
  ].join('_')
}

function printPrnPage(button) {
  const documentType = button.dataset.documentType
  const organisationName = button.dataset.organisationName
  const obligationYear = button.dataset.obligationYear
  const originalTitle = document.title
  const printTitle = buildPrnPrintFilename({
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

export function initPrnPrint() {
  const printButton = document.querySelector('[data-prn-print]')

  if (!printButton) {
    return
  }

  printButton.addEventListener('click', () => {
    printPrnPage(printButton)
  })
}
