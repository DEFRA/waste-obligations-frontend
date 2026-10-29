import { buildCertificateObligationTableRows } from '#/server/common/components/certificate-obligations-table/build-table-rows.js'
import { nameOnAccountFromAudit } from '#/server/routes/_shared/compliance/name-on-account.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/producer/compliance/certificate-submit/obligation-presenter.js'
import { formatOrganisationAddress } from '#/server/routes/_shared/compliance/compliance-submit/organisation-formatters.js'

import { dashWhenNoDataYet } from '#/server/routes/_shared/compliance/no-data-yet.js'

import {
  formatSubmissionDate,
  formatWholeTonnes,
  formatWholeTonnesOrNull
} from './utils.js'

const CERTIFICATE_VIEW_LOCALE = 'compliance.certificateView'

function mapRowForView(row, dashWhenNoData) {
  const formatNullable = dashWhenNoData
    ? formatWholeTonnesOrNull
    : formatWholeTonnes

  return {
    ...row,
    obligationToMeet: formatNullable(row.obligationToMeet),
    awaitingAcceptance: formatWholeTonnes(row.awaitingAcceptance),
    accepted: formatWholeTonnes(row.accepted),
    outstanding: formatNullable(row.outstanding)
  }
}

export function buildCertificateViewModel({ declaration, locale = 'en' }) {
  if (!declaration) {
    return null
  }

  const organisation = declaration.organisation
  const dashWhenNoData = dashWhenNoDataYet()
  const { overallStatus, obligationsRows, glassRows } =
    presentObligationsForCertificateSubmit(declaration.obligations, {
      locale,
      pageLocaleBase: CERTIFICATE_VIEW_LOCALE,
      dashWhenNoData
    })
  const obligationStatus = declaration.obligationStatus ?? overallStatus
  const presentedObligationRows = obligationsRows.map((row) =>
    mapRowForView(row, dashWhenNoData)
  )
  const presentedGlassRows = glassRows.map((row) =>
    mapRowForView(row, dashWhenNoData)
  )

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
