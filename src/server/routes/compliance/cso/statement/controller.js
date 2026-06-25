import { REGULATION_43_URL } from '#/config/constants.js'
import { csoStatementPath } from '../../_shared/compliance-paths.js'
import { pickLatestSubmittedDeclarationForYear } from '../../_shared/compliance-declaration.js'
import { getRegulatorDetails } from '../../_shared/regulator.js'
import {
  csoCompliancePre,
  csoComplianceRouteOptions
} from '../../_shared/compliance-route-options.js'
import * as middlewares from '../../_middlewares/index.js'

export const statementController = {
  method: 'GET',
  // schemeId and organisationId are interchangeable in this context
  path: '/compliance/cso/{schemeId}/statement',
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
    const { name: regulatorName, email: regulatorEmail } = getRegulatorDetails(
      request.pre?.organisation?.businessCountry
    )

    return h.view('compliance/cso/statement/index', {
      schemeId,
      year,
      regulatorName,
      regulatorEmail,
      regulation43Url: REGULATION_43_URL,
      showContinueToSubmit: submittedDeclaration == null,
      submitHref: csoStatementPath(schemeId, '/submit') + `?year=${year}`
    })
  }
}

export const statementRoutes = [statementController]
