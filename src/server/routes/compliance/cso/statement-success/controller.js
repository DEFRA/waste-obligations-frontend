import { COMPLIANCE_SCHEME_PUBLIC_REGISTER_URL } from '#/config/constants.js'
import * as middlewares from '#/server/routes/compliance/_middlewares/index.js'
import { csoStatementPath } from '#/server/routes/compliance/_shared/compliance-paths.js'
import {
  csoCompliancePre,
  csoComplianceRouteOptions
} from '#/server/routes/compliance/_shared/compliance-route-options.js'
import {
  complianceDeclarationRouteQuerySchema,
  statementSuccessParamsSchema
} from '#/server/routes/compliance/_shared/schemas.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'

import { statementRegulation43ComplianceI18nKey } from './statement-regulation43-compliance.js'

export function statementSuccessUrl(schemeId, locale, complianceDeclarationId) {
  return appendLangQuery(
    csoStatementPath(schemeId, `/${complianceDeclarationId}/success`),
    locale
  )
}

function buildStatementSuccessViewModel(declaration, userEmail, locale) {
  return {
    year: declaration.obligationYear,
    userEmail,
    regulatorName: declaration.organisation.regulator,
    regulatorEmail: declaration.organisation.regulatorEmail,
    regulation43ComplianceKey: statementRegulation43ComplianceI18nKey(
      declaration,
      locale
    ),
    publicRegisterUrl: COMPLIANCE_SCHEME_PUBLIC_REGISTER_URL
  }
}

export const statementSuccessController = {
  method: 'GET',
  path: '/compliance/cso/{schemeId}/statement/{complianceDeclarationId}/success',
  options: {
    ...csoComplianceRouteOptions,
    validate: {
      ...csoComplianceRouteOptions.validate,
      params: statementSuccessParamsSchema,
      query: complianceDeclarationRouteQuerySchema
    },
    pre: csoCompliancePre(middlewares.complianceDeclaration)
  },
  async handler(request, h) {
    const declaration = request.pre.complianceDeclaration
    const userEmail = request.yar.get('user')?.email ?? ''

    return h.view(
      'compliance/cso/statement-success/index',
      buildStatementSuccessViewModel(declaration, userEmail, getLocale(request))
    )
  }
}

export const statementSuccessRoutes = [statementSuccessController]
