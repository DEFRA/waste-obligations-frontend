import { buildCertificateObligationTableRows } from '#/server/common/components/certificate-obligations-table/build-table-rows.js'
import { nameOnAccountFromAudit } from '#/server/routes/compliance/_shared/name-on-account.js'
import { presentObligationsForCertificateSubmit } from '#/server/routes/compliance/producer/certificate-submit/obligation-presenter.js'
import { formatOrganisationAddress } from '#/server/routes/compliance/_shared/compliance-submit/organisation-formatters.js'

import { formatSubmissionDate, formatWholeTonnes } from './utils.js'

import { resolveComponentLocaleKey } from '#/server/common/helpers/i18n/component-locale-key.js'

const CERTIFICATE_VIEW_LOCALE = 'compliance.certificateView'

const VIEW_STATUS_TAG_CONFIG = {
  Met: { variant: 'green', key: 'obligationStatus.met' },
  NotMet: { variant: 'yellow', key: 'obligationStatus.notMet' },
  NoDataYet: { variant: 'grey', key: 'obligationStatus.noDataYet' }
}

function viewStatusTag(locale, status) {
  const config = VIEW_STATUS_TAG_CONFIG[status]

  if (!config) {
    return null
  }

  return {
    variant: config.variant,
    i18nKey: resolveComponentLocaleKey(
      locale,
      CERTIFICATE_VIEW_LOCALE,
      'obligationsTable',
      config.key
    )
  }
}

function mapRowForView(row, locale) {
  const tag = viewStatusTag(locale, row.status) ?? row.tag

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
  const presentedObligationRows = obligationsRows.map((row) =>
    mapRowForView(row, locale)
  )
  const presentedGlassRows = glassRows.map((row) => mapRowForView(row, locale))

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
