import Boom from '@hapi/boom'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { ApiError } from '#/server/services/base/api-error.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'

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

  request.logger.error(
    { err: error },
    `Failed to create compliance declaration (organisationId=${organisationId}, year=${year}, complianceType=${complianceType}, status=${status})`
  )
}

export function renderComplianceSubmitError(request, h, complianceType) {
  const locale = getLocale(request)
  const baseKey = `compliance.submitError.${complianceType}`

  return h.view('compliance/submit-error/index', {
    pageTitle: translate(locale, `${baseKey}.pageTitle`),
    heading: translate(locale, `${baseKey}.heading`),
    complianceType
  })
}

export function handleComplianceSubmitFailure(
  request,
  h,
  { organisationId, year, complianceType, error }
) {
  logComplianceSubmitFailure(request, {
    organisationId,
    year,
    complianceType,
    error
  })

  if (!isComplianceSubmitApiUnavailable(error)) {
    throw Boom.badGateway('Unable to submit compliance declaration')
  }

  return renderComplianceSubmitError(request, h, complianceType)
}
