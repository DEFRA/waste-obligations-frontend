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

export function statementSuccessUrl(schemeId, locale, complianceDeclarationId) {
  return appendLangQuery(
    csoStatementPath(schemeId, `/${complianceDeclarationId}/success`),
    locale
  )
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

    return h.view('compliance/cso/statement-success/index', {
      year: declaration.obligationYear
    })
  }
}

export const statementSuccessRoutes = [statementSuccessController]
