import { buildCertificateObligationTableRows } from '#/server/common/components/certificate-obligations-table/build-table-rows.js'
import { nameOnAccountFromAudit } from '#/server/routes/compliance/_shared/name-on-account.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/compliance/producer/certificate-submit/obligation-presenter.js'
import {
  buildCertificateSubmitDeclarationText,
  formatOrganisationAddress
} from '#/server/routes/compliance/producer/certificate-submit/utils.js'

import { formatSubmissionDate, formatWholeTonnes } from './utils.js'

const VIEW_STATUS_TAG = {
  Met: {
    variant: 'green',
    i18nKey: 'compliance.certificateView.obligationStatus.met'
  },
  NotMet: {
    variant: 'yellow',
    i18nKey: 'compliance.certificateView.obligationStatus.notMet'
  },
  NoDataYet: {
    variant: 'grey',
    i18nKey: 'compliance.certificateView.obligationStatus.noDataYet'
  }
}

function mapRowForView(row) {
  const tag = VIEW_STATUS_TAG[row.status] ?? row.tag

  return {
    ...row,
    obligationToMeet: formatWholeTonnes(row.obligationToMeet),
    awaitingAcceptance: formatWholeTonnes(row.awaitingAcceptance),
    accepted: formatWholeTonnes(row.accepted),
    outstanding: formatWholeTonnes(row.outstanding),
    tag
  }
}

export function buildCertificateViewModel({ declaration, locale = 'en' }) {
  if (!declaration) {
    return null
  }

  const organisation = declaration.organisation
  const { overallStatus, obligationsRows, glassRows } =
    presentObligationsForCertificateSubmit(declaration.obligations)
  const obligationStatus = declaration.obligationStatus ?? overallStatus
  const declarationText = buildCertificateSubmitDeclarationText(
    locale,
    organisation.name ?? ''
  )
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
    declarationText,
    submitterName: declaration.submitterName
  }
}
