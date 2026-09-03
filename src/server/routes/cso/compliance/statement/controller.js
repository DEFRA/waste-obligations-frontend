import { REGULATION_43_URL } from '#/config/constants.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { csoStatementPath } from '#/server/routes/_shared/compliance/compliance-paths.js'
import { pickLatestSubmittedDeclarationForYear } from '#/server/routes/_shared/compliance/compliance-declaration.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import {
  csoCompliancePre,
  csoComplianceRouteOptions
} from '#/server/routes/_shared/compliance/compliance-route-options.js'
import * as middlewares from '#/server/routes/_shared/compliance/_middlewares/index.js'

export const statementController = {
  method: 'GET',
  // schemeId and organisationId are interchangeable in this context
  path: '/cso/{schemeId}/compliance/statement',
  options: {
    ...csoComplianceRouteOptions,
    pre: csoCompliancePre(middlewares.organisation, middlewares.declarations)
  },
  async handler(request, h) {
    const { schemeId } = request.params
    const { year } = request.query
    const submittedDeclaration = pickLatestSubmittedDeclarationForYear(
      request.pre.declarations,
      year
    )
    const regulator = getRegulatorDetails(
      request.pre?.organisation?.businessCountry,
      getLocale(request)
    )

    return h.view('cso/compliance/statement/index', {
      schemeId,
      year,
      regulatorName: regulator.nameWithArticle,
      regulatorEmail: regulator.email,
      regulation43Url: REGULATION_43_URL,
      showContinueToSubmit: submittedDeclaration == null,
      submitHref: withForwardedPrefix(
        request,
        csoStatementPath(schemeId, '/submit') + `?year=${year}`
      )
    })
  }
}

export const statementRoutes = [statementController]
