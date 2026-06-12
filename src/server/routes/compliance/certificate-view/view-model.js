import { getRegulatorDetails } from '../_shared/regulator.js'
import { pickLatestDeclarationForYear } from '../_shared/compliance-declaration.js'
import { presentObligationsForCertificateSubmit } from '../certificate-submit/obligation-presenter.js'
import {
  formatOrganisationAddress,
  formatOrganisationName
} from '../certificate-submit/utils.js'
import { buildCertificateObligationTableRows } from '#/server/common/components/certificate-obligations-table/build-table-rows.js'
import {
  formatSubmissionDate,
  formatWholeTonnes,
  parseCertificateDeclarationApiText
} from './utils.js'

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

export function buildCertificateViewModel({
  declarations,
  organisation,
  currentOrganisation,
  user,
  year
}) {
  const declaration = pickLatestDeclarationForYear(declarations, year)

  if (!declaration) {
    return null
  }

  const regulator = getRegulatorDetails(organisation?.businessCountry)
  const { overallStatus, obligationsRows, glassRows } =
    presentObligationsForCertificateSubmit(declaration.obligations)
  const obligationStatus = declaration.obligationStatus ?? overallStatus
  const declarationText = parseCertificateDeclarationApiText(
    declaration.declarationText?.text
  )
  const locale = declaration.declarationText?.language ?? 'en'
  const presentedObligationRows = obligationsRows.map(mapRowForView)
  const presentedGlassRows = glassRows.map(mapRowForView)

  return {
    year: Number(year),
    organisationName: formatOrganisationName(organisation, year),
    organisationNumber: currentOrganisation.organisationNumber,
    organisationAddress: formatOrganisationAddress(organisation?.address),
    nameOnAccount: `${user.firstName} ${user.lastName}`.trim(),
    submissionDate: formatSubmissionDate(
      declaration.updated ?? declaration.created
    ),
    regulatorName: regulator.name,
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
