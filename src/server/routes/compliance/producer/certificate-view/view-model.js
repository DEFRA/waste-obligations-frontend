import { buildCertificateObligationTableRows } from '#/server/common/components/certificate-obligations-table/build-table-rows.js'
import { nameOnAccountFromAudit } from '#/server/routes/compliance/_shared/name-on-account.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/compliance/producer/certificate-submit/obligation-presenter.js'
import { formatOrganisationAddress } from '#/server/routes/compliance/_shared/compliance-submit/organisation-formatters.js'

import { formatSubmissionDate, formatWholeTonnes } from './utils.js'

const CERTIFICATE_VIEW_LOCALE = 'compliance.certificateView'

function mapRowForView(row) {
  return {
    ...row,
    obligationToMeet: formatWholeTonnes(row.obligationToMeet),
    awaitingAcceptance: formatWholeTonnes(row.awaitingAcceptance),
    accepted: formatWholeTonnes(row.accepted),
    outstanding: formatWholeTonnes(row.outstanding)
  }
}

export function buildCertificateViewModel({ declaration, locale = 'en' }) {
  if (!declaration) {
    return null
  }

  const organisation = declaration.organisation
  const { overallStatus, obligationsRows, glassRows } =
    presentObligationsForCertificateSubmit(declaration.obligations, {
      locale,
      pageLocaleBase: CERTIFICATE_VIEW_LOCALE
    })
  const obligationStatus = declaration.obligationStatus ?? overallStatus
  const presentedObligationRows = obligationsRows.map(mapRowForView)
  const presentedGlassRows = glassRows.map(mapRowForView)

  return {
    year: declaration.obligationYear,
    organisationName: organisation.name ?? '',
    organisationNumber: organisation.referenceNumber ?? '',
    organisationAddress: formatOrganisationAddress(organisation.address),
    nameOnAccount: nameOnAccountFromAudit(declaration.audit),
    submissionDate: formatSubmissionDate(
      declaration.updated ?? declaration.created
    ),
    regulatorName: organisation.regulator,
    obligationStatus,
    obligationsRows: presentedObligationRows,
    glassRows: presentedGlassRows,
    obligationsTableRows: buildCertificateObligationTableRows(
      presentedObligationRows,
      locale
    ),
    glassTableRows: buildCertificateObligationTableRows(
      presentedGlassRows,
      locale
    ),
    submitterName: declaration.submitterName
  }
}
