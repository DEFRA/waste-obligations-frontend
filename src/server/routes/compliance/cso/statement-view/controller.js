import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import * as middlewares from '#/server/routes/compliance/_middlewares/index.js'
import { csoStatementPath } from '#/server/routes/compliance/_shared/compliance-paths.js'
import {
  csoCompliancePre,
  csoComplianceRouteOptions
} from '#/server/routes/compliance/_shared/compliance-route-options.js'
import {
  complianceDeclarationRouteQuerySchema,
  statementViewParamsSchema
} from '#/server/routes/compliance/_shared/schemas.js'

import { buildStatementViewModel } from './view-model.js'

export const statementViewController = {
  method: 'GET',
  path: '/compliance/cso/{schemeId}/statement/{complianceDeclarationId}',
  options: {
    ...csoComplianceRouteOptions,
    validate: {
      ...csoComplianceRouteOptions.validate,
      params: statementViewParamsSchema,
      query: complianceDeclarationRouteQuerySchema
    },
    pre: csoCompliancePre(middlewares.complianceDeclaration)
  },
  async handler(request, h) {
    const { schemeId } = request.params
    const declaration = request.pre.complianceDeclaration
    const viewModel = buildStatementViewModel({
      declaration,
      locale: getLocale(request)
    })

    return h.view('compliance/cso/statement-view/index', {
      schemeId,
      ...viewModel
    })
  }
}

export function statementViewUrl(schemeId, locale, complianceDeclarationId) {
  return appendLangQuery(
    csoStatementPath(schemeId, `/${complianceDeclarationId}`),
    locale
  )
}

export const statementViewRoutes = [statementViewController]
