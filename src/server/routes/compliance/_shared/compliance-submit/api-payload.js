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
  organisationNumber
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
    user: buildSubmitterUser(user)
  }
}

export function buildStatementComplianceDeclarationPayload({
  cachedPayload,
  user,
  fullName,
  regulation43Compliant
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
    user: buildSubmitterUser(user)
  }
}
