import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import * as middlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import { csoStatementPath } from '#/server/routes/_shared/compliance/compliance-paths.js'
import {
  csoComplianceViewPre,
  csoComplianceRouteOptions
} from '#/server/routes/_shared/compliance/compliance-route-options.js'
import {
  complianceDeclarationRouteQuerySchema,
  statementViewParamsSchema
} from '#/server/routes/_shared/compliance/schemas.js'

import { buildStatementViewModel } from './view-model.js'

export const statementViewController = {
  method: 'GET',
  path: '/cso/{schemeId}/compliance/statement/{complianceDeclarationId}',
  options: {
    ...csoComplianceRouteOptions,
    validate: {
      ...csoComplianceRouteOptions.validate,
      params: statementViewParamsSchema,
      query: complianceDeclarationRouteQuerySchema
    },
    pre: csoComplianceViewPre(middlewares.complianceDeclaration)
  },
  async handler(request, h) {
    const { schemeId } = request.params
    const declaration = request.pre.complianceDeclaration
    const viewModel = buildStatementViewModel({
      declaration,
      locale: getLocale(request)
    })

    return h.view('cso/compliance/statement-view/index', {
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
