import { buildCertificateObligationTableRows } from '#/server/common/components/certificate-obligations-table/build-table-rows.js'
import { nameOnAccountFromAudit } from '#/server/routes/_shared/compliance/name-on-account.js'
import { formatOrganisationAddress } from '#/server/routes/_shared/compliance/compliance-submit/organisation-formatters.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/producer/compliance/certificate-submit/obligation-presenter.js'

import { resolveStatementComplianceStatus } from './statement-compliance-status.js'
import {
  formatSubmissionDate,
  formatWholeTonnes
} from '#/server/routes/producer/compliance/certificate-view/utils.js'

const STATEMENT_VIEW_LOCALE = 'compliance.statementView'

function mapRowForView(row) {
  return {
    ...row,
    obligationToMeet: formatWholeTonnes(row.obligationToMeet),
    awaitingAcceptance: formatWholeTonnes(row.awaitingAcceptance),
    accepted: formatWholeTonnes(row.accepted),
    outstanding: formatWholeTonnes(row.outstanding)
  }
}

export function buildStatementViewModel({ declaration, locale = 'en' }) {
  if (!declaration) {
    return null
  }

  const organisation = declaration.organisation
  const complianceSchemeName = organisation.complianceSchemeName ?? ''
  const { overallStatus, obligationsRows, glassRows } =
    presentObligationsForCertificateSubmit(declaration.obligations, {
      locale,
      pageLocaleBase: STATEMENT_VIEW_LOCALE
    })
  const obligationStatus = declaration.obligationStatus ?? overallStatus
  const presentedObligationRows = obligationsRows.map(mapRowForView)
  const presentedGlassRows = glassRows.map(mapRowForView)
  const complianceStatus = resolveStatementComplianceStatus(declaration)

  return {
    year: declaration.obligationYear,
    complianceSchemeName,
    schemeOperatorName: organisation.schemeOperatorName ?? '',
    organisationNumber: organisation.referenceNumber ?? '',
    organisationAddress: formatOrganisationAddress(organisation.address),
    nameOnAccount: nameOnAccountFromAudit(declaration.audit),
    submissionDate: formatSubmissionDate(
      declaration.updated ?? declaration.created
    ),
    regulatorName: organisation.regulator,
    obligationStatus,
    complianceStatus,
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
