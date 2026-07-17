import { formatNameOnAccount } from '#/server/routes/compliance/_shared/name-on-account.js'
import { isRegulation43Compliant } from '#/server/routes/compliance/_shared/regulation43-validation.js'

import {
  formatOrganisationName,
  formatSchemeOperatorName
} from './organisation-formatters.js'

function buildSubmitterUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: formatNameOnAccount(user)
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
    isWelshLanguageToggle: locale === 'cy',
    user: buildSubmitterUser(user)
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
    isWelshLanguageToggle: locale === 'cy',
    user: buildSubmitterUser(user)
  }
}
