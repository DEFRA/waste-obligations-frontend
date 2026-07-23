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
import { getRegulatorDetailsByName } from '#/server/routes/compliance/_shared/regulator.js'

import { statementViewUrl } from '../statement-view/controller.js'

export function statementSuccessUrl(schemeId, locale, complianceDeclarationId) {
  return appendLangQuery(
    csoStatementPath(schemeId, `/${complianceDeclarationId}/success`),
    locale
  )
}

function buildStatementSuccessViewModel(declaration, userEmail, locale) {
  const regulator = getRegulatorDetailsByName(
    declaration.organisation.regulator,
    locale
  )

  return {
    year: declaration.obligationYear,
    userEmail,
    regulatorName: regulator.nameWithArticle,
    regulatorEmail: declaration.organisation.regulatorEmail,
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
    const { schemeId } = request.params
    const declaration = request.pre.complianceDeclaration
    const locale = getLocale(request)
    const userEmail = request.yar.get('user')?.email ?? ''
    const viewModel = buildStatementSuccessViewModel(
      declaration,
      userEmail,
      locale
    )

    return h.view('compliance/cso/statement-success/index', {
      ...viewModel,
      statementViewHref: statementViewUrl(schemeId, locale, declaration.id)
    })
  }
}

export const statementSuccessRoutes = [statementSuccessController]
