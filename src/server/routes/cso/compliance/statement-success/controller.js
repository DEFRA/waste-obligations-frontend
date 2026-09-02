import { COMPLIANCE_SCHEME_PUBLIC_REGISTER_URL } from '#/config/constants.js'
import * as middlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'
import { csoStatementPath } from '#/server/routes/_shared/compliance/compliance-paths.js'
import {
  csoCompliancePre,
  csoComplianceRouteOptions
} from '#/server/routes/_shared/compliance/compliance-route-options.js'
import {
  complianceDeclarationRouteQuerySchema,
  statementSuccessParamsSchema
} from '#/server/routes/_shared/compliance/schemas.js'
import { appendLangQuery } from '#/server/common/helpers/i18n/locale-url.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { getRegulatorDetailsByName } from '#/server/routes/_shared/compliance/regulator.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'

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
  path: '/cso/{schemeId}/compliance/statement/{complianceDeclarationId}/success',
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

    return h.view('cso/compliance/statement-success/index', {
      ...viewModel,
      statementViewHref: withForwardedPrefix(
        request,
        statementViewUrl(schemeId, locale, declaration.id)
      )
    })
  }
}

export const statementSuccessRoutes = [statementSuccessController]
