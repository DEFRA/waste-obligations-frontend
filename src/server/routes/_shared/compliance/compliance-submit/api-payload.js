import { formatNameOnAccount } from '#/server/routes/_shared/compliance/name-on-account.js'
import { isRegulation43Compliant } from '#/server/routes/_shared/compliance/regulation43-validation.js'

import {
  formatOrganisationName,
  formatSchemeOperatorName
} from './organisation-formatters.js'

function buildSubmitterUser(user, locale) {
  return {
    id: user.id,
    email: user.email,
    name: formatNameOnAccount(user),
    locale
  }
}

export function buildProducerComplianceDeclarationPayload({
  cachedPayload,
  user,
  fullName,
  organisationNumber,
  locale
}) {
  const {
    organisation,
    obligationYear,
    obligations,
    obligationStatus,
    regulatorName,
    regulatorEmail
  } = cachedPayload

  return {
    organisation: {
      id: organisation.id,
      registrationType: 'DirectProducer',
      name: formatOrganisationName(organisation, obligationYear),
      referenceNumber: organisationNumber,
      address: organisation.address,
      complianceSchemeName: null,
      schemeOperatorName: null,
      regulator: regulatorName,
      regulatorEmail
    },
    obligations,
    obligationYear,
    obligationStatus,
    submitterName: fullName.trim(),
    user: buildSubmitterUser(user, locale)
  }
}

export function buildStatementComplianceDeclarationPayload({
  cachedPayload,
  user,
  fullName,
  regulation43Compliant,
  locale
}) {
  const {
    organisation,
    obligationYear,
    obligations,
    obligationStatus,
    regulatorName,
    regulatorEmail,
    organisationNumber
  } = cachedPayload
  const complianceSchemeName = formatOrganisationName(
    organisation,
    obligationYear
  )

  return {
    organisation: {
      id: organisation.id,
      registrationType: 'ComplianceScheme',
      name: null,
      referenceNumber: organisationNumber,
      address: organisation.address,
      complianceSchemeName,
      schemeOperatorName: formatSchemeOperatorName(organisation),
      regulator: regulatorName,
      regulatorEmail
    },
    obligations,
    obligationYear,
    obligationStatus,
    submitterName: fullName.trim(),
    isRegulation43Compliant: isRegulation43Compliant(regulation43Compliant),
    user: buildSubmitterUser(user, locale)
  }
}
