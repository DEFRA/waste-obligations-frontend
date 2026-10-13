import {
  sanitizeFilenamePart,
  sanitizeOrganisationNameForFilename,
  formatPrintTimestamp
} from './print-utils'

export function buildCompliancePrintFilename({
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
