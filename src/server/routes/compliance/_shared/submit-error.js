import Boom from '@hapi/boom'

import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { logApplicationError } from '#/server/common/helpers/logging/application-error.js'
import { ApiError } from '#/server/services/base/api-error.js'

export const COMPLIANCE_SUBMIT_TYPES = {
  certificate: 'certificate',
  statement: 'statement'
}

export function isComplianceSubmitApiUnavailable(error) {
  if (error instanceof ApiError) {
    if (error.status === statusCodes.notFound) {
      return false
    }

    return (
      error.status >= statusCodes.internalServerError ||
      error.status === statusCodes.requestTimeout
    )
  }

  return true
}

export function logComplianceSubmitFailure(
  request,
  { organisationId, year, complianceType, error }
) {
  const status = error instanceof ApiError ? error.status : 'unknown'

  logApplicationError(
    request.logger,
    'error',
    error,
    `Failed to create compliance declaration (organisationId=${organisationId}, year=${year}, complianceType=${complianceType}, status=${status})`
  )
}

export function handleComplianceSubmitFailure(
  request,
  _h,
  { organisationId, year, complianceType, error }
) {
  logComplianceSubmitFailure(request, {
    organisationId,
    year,
    complianceType,
    error
  })

  if (!isComplianceSubmitApiUnavailable(error)) {
    throw Boom.badGateway(
      translate(getLocale(request), 'compliance.errors.submitDeclaration')
    )
  }

  throw Boom.badImplementation()
}
